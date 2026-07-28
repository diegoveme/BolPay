import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  Prisma,
  type Escrow,
  type Milestone,
  type PayrollItem,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types/auth';
import { sumAmounts } from '../../common/decimal.util';
import {
  ESCROW_CHAIN_ADAPTER,
  type ChainDistribution,
  type EscrowChainAdapter,
} from './chain/escrow-chain.adapter';

export interface DisputeDistribution {
  freelancerAddress: string;
  freelancerAmount: Prisma.Decimal;
  companyAddress: string;
  companyAmount: Prisma.Decimal;
}

/**
 * Domain orchestration for escrows: persists local escrow state, drives the
 * on-chain provider (Trustless Work) and keeps the settlement audit trail
 * (Transaction rows with Stellar hashes) in sync.
 */
@Injectable()
export class EscrowService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ESCROW_CHAIN_ADAPTER) private readonly chain: EscrowChainAdapter,
    private readonly config: ConfigService,
  ) {}

  /** Real on-chain mode: a confirmation MUST carry a real tx hash (no SIM). */
  private get requiresOnChainHash(): boolean {
    return this.config.get<string>('escrowMode') === 'trustless_work';
  }

  /** Fail-closed in real mode; only simulated mode mints a placeholder hash. */
  private settleHash(txHash?: string): string {
    if (txHash) return txHash;
    if (this.requiresOnChainHash) {
      throw new BadRequestException(
        'Missing the signed on-chain transaction hash (cannot confirm without signing)',
      );
    }
    return `SIM${randomBytes(30).toString('hex')}`;
  }

  // -- Non-custodial flow: the company signs funding with its own wallet -------

  /**
   * Deploy the escrow contract for an accepted contract - NO funds moved yet.
   * Deploying only creates the Soroban contract (no money), so BolPay can do it
   * server-side and obtain the contractId. Funding is signed by the company.
   */
  async deployContractEscrow(
    contractId: string,
    title: string,
    description: string | null,
    milestones: Pick<Milestone, 'id' | 'position' | 'title' | 'amount'>[],
    freelancerAddress: string,
    companyAddress: string,
  ): Promise<Escrow> {
    const total = sumAmounts(milestones);
    const deploy = await this.chain.deployMultiRelease({
      engagementId: `contract-${contractId}`,
      title,
      description: description ?? title,
      milestones: [...milestones]
        .sort((a, b) => a.position - b.position)
        .map((m) => ({
          description: m.title,
          amount: m.amount.toNumber(),
          receiver: freelancerAddress,
        })),
      // Non-custodial roles: the company approves, the freelancer delivers.
      // releaseSigner + disputeResolver are omitted so the PLATFORM executes
      // them (release to the freelancer's locked receiver, or the agreed dispute
      // split). It can only pay the fixed party addresses, never redirect/skim,
      // so the company signs ONE approval per milestone instead of approve+release.
      roles: {
        approver: companyAddress,
        serviceProvider: freelancerAddress,
      },
    });
    return this.prisma.escrow.create({
      data: {
        type: 'contract',
        status: 'created',
        trustlessWorkId: deploy.contractId,
        // Expected total; status stays 'created' until the company funds it.
        fundedAmount: total,
        // Seed to 0 so later atomic increments never operate on a NULL column.
        releasedAmount: new Prisma.Decimal(0),
      },
    });
  }

  /**
   * Build the UNSIGNED fund XDR for the company to sign with its own wallet.
   * `{ unsignedXdr: null }` in simulated mode (no signature needed).
   */
  async prepareContractFund(
    escrow: Escrow,
    companyAddress: string,
    amount: Prisma.Decimal,
  ): Promise<{ unsignedXdr: string | null }> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Escrow has no on-chain contract id');
    }
    const unsignedXdr = await this.chain.buildFundXdr(
      escrow.trustlessWorkId,
      amount.toString(),
      companyAddress,
    );
    return { unsignedXdr };
  }

  /** Record the fund once the company signed+submitted it (or simulated). */
  async confirmContractFund(
    escrow: Escrow,
    amount: Prisma.Decimal,
    txHash?: string,
  ): Promise<string> {
    const hash = this.settleHash(txHash);
    // Atomic claim: only the first confirm flips 'created' -> 'funded'. A
    // duplicate confirm sees status !== 'created', claims 0 rows and aborts, so
    // the fund is recorded exactly once.
    const claimed = await this.prisma.escrow.updateMany({
      where: { id: escrow.id, status: 'created' },
      data: { status: 'funded' },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Escrow is already funded');
    }
    await this.prisma.transaction.create({
      data: {
        operation: 'fund',
        amount,
        stellarHash: hash,
        confirmedAt: new Date(),
      },
    });
    return hash;
  }

  /** Build the unsigned APPROVE XDR for the company (approver) to sign. */
  async prepareMilestoneApprove(
    escrow: Escrow,
    milestone: Milestone,
    companyAddress: string,
  ): Promise<{ approveXdr: string | null }> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Escrow has no on-chain contract id');
    }
    const approveXdr = await this.chain.buildApproveXdr(
      escrow.trustlessWorkId,
      milestone.position,
      companyAddress,
    );
    return { approveXdr };
  }

  /**
   * Release an approved milestone's funds, signed by the PLATFORM (the release
   * signer). The company only signs the approval; the platform then executes the
   * payout to the milestone's locked receiver (the freelancer), so it can never
   * redirect the funds. TW only builds the release once the milestone is
   * approved on-chain, so a caller cannot release without a real approval. In
   * simulated mode the adapter returns a fake hash.
   */
  async releaseMilestoneAsPlatform(
    escrow: Escrow,
    milestone: Milestone,
  ): Promise<string> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Escrow has no on-chain contract id');
    }
    const { txHash } = await this.chain.releaseMilestone(
      escrow.trustlessWorkId,
      milestone.position,
    );
    return this.recordMilestoneRelease(escrow, milestone, txHash);
  }

  /** Persist a milestone release: cumulative amount, transaction and status. */
  private async recordMilestoneRelease(
    escrow: Escrow,
    milestone: Milestone,
    hash: string,
  ): Promise<string> {
    // Atomic increment so two concurrent releases cannot clobber each other's
    // cumulative total (read-modify-write would lose one update). Decide the
    // final status from the returned fresh row, not the stale in-memory value.
    const updatedEscrow = await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: { releasedAmount: { increment: milestone.amount } },
    });
    const released = updatedEscrow.releasedAmount ?? new Prisma.Decimal(0);
    const fullyReleased =
      escrow.fundedAmount !== null && released.gte(escrow.fundedAmount);
    await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          operation: 'release',
          amount: milestone.amount,
          stellarHash: hash,
          confirmedAt: new Date(),
          milestoneId: milestone.id,
        },
      }),
      this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { status: fullyReleased ? 'released' : 'funded' },
      }),
    ]);
    return hash;
  }

  /**
   * Build the unsigned change-status XDR for the FREELANCER to sign when
   * marking a milestone delivered. `{ deliverXdr: null }` in simulated mode.
   */
  async prepareMilestoneDeliver(
    escrow: Escrow,
    milestone: Milestone,
    freelancerAddress: string,
    evidence: string,
  ): Promise<{ deliverXdr: string | null }> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Escrow has no on-chain contract id');
    }
    const deliverXdr = await this.chain.buildChangeStatusXdr(
      escrow.trustlessWorkId,
      milestone.position,
      evidence,
      freelancerAddress,
    );
    return { deliverXdr };
  }

  /**
   * Build the unsigned dispute XDR for a PARTY to sign (TW only lets a party
   * open a dispute). `{ disputeXdr: null }` in simulated mode.
   */
  async prepareDisputeOpen(
    escrow: Escrow,
    milestone: Milestone,
    signerAddress: string,
  ): Promise<{ disputeXdr: string | null }> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Escrow has no on-chain contract id');
    }
    const disputeXdr = await this.chain.buildDisputeXdr(
      escrow.trustlessWorkId,
      milestone.position,
      signerAddress,
    );
    return { disputeXdr };
  }

  /** Execute an agreed dispute resolution over the escrow (split supported). */
  async resolveMilestoneDispute(
    escrow: Escrow,
    milestone: Milestone,
    distribution: DisputeDistribution,
  ): Promise<string> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Escrow has no on-chain contract id');
    }
    // TW wants { address, amount } objects with a numeric amount and rejects
    // any amount <= 0, so only the non-zero shares are sent.
    const distributions: ChainDistribution[] = [];
    if (distribution.freelancerAmount.gt(0)) {
      distributions.push({
        address: distribution.freelancerAddress,
        amount: distribution.freelancerAmount.toNumber(),
      });
    }
    if (distribution.companyAmount.gt(0)) {
      distributions.push({
        address: distribution.companyAddress,
        amount: distribution.companyAmount.toNumber(),
      });
    }

    const result = await this.chain.resolveDispute(
      escrow.trustlessWorkId,
      milestone.position,
      distributions,
    );

    // Atomic increment (same rationale as confirmMilestoneRelease): never lose a
    // concurrent update to the cumulative released total.
    const updatedEscrow = await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: { releasedAmount: { increment: milestone.amount } },
    });
    const released = updatedEscrow.releasedAmount ?? new Prisma.Decimal(0);
    const fullyReleased =
      escrow.fundedAmount !== null && released.gte(escrow.fundedAmount);

    const audit: Prisma.PrismaPromise<unknown>[] = [];
    if (distribution.freelancerAmount.gt(0)) {
      audit.push(
        this.prisma.transaction.create({
          data: {
            operation: 'release',
            amount: distribution.freelancerAmount,
            stellarHash: result.txHash,
            confirmedAt: new Date(),
            milestoneId: milestone.id,
          },
        }),
      );
    }
    if (distribution.companyAmount.gt(0)) {
      audit.push(
        this.prisma.transaction.create({
          data: {
            operation: 'refund',
            amount: distribution.companyAmount,
            // The on-chain resolution is one transaction; the hash is unique,
            // so only the first audit row stores it.
            stellarHash: distribution.freelancerAmount.gt(0)
              ? null
              : result.txHash,
            confirmedAt: new Date(),
            milestoneId: milestone.id,
          },
        }),
      );
    }

    await this.prisma.$transaction([
      ...audit,
      this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { status: fullyReleased ? 'released' : 'funded' },
      }),
    ]);
    return result.txHash;
  }

  // -- Payroll escrows ----------------------------------------------------------

  /** Deploy the payroll escrow contract only - the company funds it by signing. */
  async deployPayrollEscrow(
    payrollId: string,
    payrollName: string,
    items: Pick<
      PayrollItem,
      'id' | 'recipientAddress' | 'recipientLabel' | 'amount'
    >[],
  ): Promise<Escrow> {
    const deploy = await this.chain.deployMultiRelease({
      engagementId: `payroll-${payrollId}-${Date.now()}`,
      title: `Payroll: ${payrollName}`,
      description: `BolPay payroll escrow (${items.length} recipients)`,
      milestones: items.map((item) => ({
        description: item.recipientLabel ?? item.recipientAddress,
        amount: item.amount.toNumber(),
        receiver: item.recipientAddress,
      })),
      // Payroll has no counterparty and the recipients are LOCKED here at
      // deploy. Omitting roles lets the platform hold them, so it can execute
      // the scheduled release on payday (it can only pay these exact recipients
      // these exact amounts - it cannot redirect or skim). The company's only
      // money decision is funding the cycle, which it signs itself.
    });
    const total = sumAmounts(items);
    return this.prisma.escrow.create({
      data: {
        type: 'payroll',
        status: 'created',
        trustlessWorkId: deploy.contractId,
        fundedAmount: total,
        // Seed to 0 so later atomic increments never operate on a NULL column.
        releasedAmount: new Prisma.Decimal(0),
      },
    });
  }

  /** Release one payroll item (position = index within the funded cycle). */
  async releasePayrollItem(
    escrow: Escrow,
    item: PayrollItem,
    position: number,
    executionId: string,
  ): Promise<string> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Payroll escrow has no on-chain contract id');
    }
    // Platform holds every role for payroll, so it walks the full release flow:
    // mark the recipient's slice done, approve it, and release the funds to the
    // (locked) recipient address.
    await this.chain.markMilestoneDone(
      escrow.trustlessWorkId,
      position,
      item.recipientLabel ?? 'payroll',
    );
    await this.chain.approveMilestone(escrow.trustlessWorkId, position);
    const release = await this.chain.releaseMilestone(
      escrow.trustlessWorkId,
      position,
    );

    await this.prisma.transaction.create({
      data: {
        operation: 'payroll_distribution',
        amount: item.amount,
        stellarHash: release.txHash,
        confirmedAt: new Date(),
        payrollItemId: item.id,
        payrollExecutionId: executionId,
      },
    });
    return release.txHash;
  }

  /**
   * Relay a transaction a self-custodial wallet (SWK) already signed to the
   * chain provider and return its hash. Pollar wallets submit themselves.
   */
  async submitSignedTx(signedXdr: string): Promise<{ txHash: string }> {
    return { txHash: await this.chain.submitSigned(signedXdr) };
  }

  // -- Queries -------------------------------------------------------------------

  /** List every escrow with its contract/payroll summary (administrators). */
  listAll() {
    return this.prisma.escrow.findMany({
      include: {
        contract: { select: { id: true, title: true } },
        payroll: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Fetch one escrow, enforcing that the caller is a party to it. */
  async findById(id: string, user: AuthUser) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            company: { select: { userId: true, name: true } },
            freelancer: { select: { userId: true, displayName: true } },
            milestones: {
              include: { transactions: true },
              orderBy: { position: 'asc' },
            },
          },
        },
        payroll: {
          include: { company: { select: { userId: true, name: true } } },
        },
      },
    });
    if (!escrow) throw new NotFoundException('Escrow not found');

    if (user.role !== 'administrator') {
      const allowed =
        escrow.contract?.company.userId === user.id ||
        escrow.contract?.freelancer.userId === user.id ||
        escrow.payroll?.company.userId === user.id;
      if (!allowed)
        throw new ForbiddenException('You are not a party to this escrow');
    }
    return escrow;
  }
}
