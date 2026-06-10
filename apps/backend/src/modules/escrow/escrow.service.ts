import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Escrow,
  type Milestone,
  type PayrollItem,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types/auth';
import {
  ESCROW_CHAIN_ADAPTER,
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
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ESCROW_CHAIN_ADAPTER) private readonly chain: EscrowChainAdapter,
  ) {}

  // -- Contract escrows ---------------------------------------------------------

  /**
   * Deploy + fund the escrow for an accepted contract (docs §2: "Fondeo
   * automático del escrow al aceptar el contrato"). One on-chain milestone per
   * contract milestone; receivers are the freelancer's Stellar wallet.
   */
  async createAndFundContractEscrow(
    contractId: string,
    title: string,
    description: string | null,
    milestones: Pick<Milestone, 'id' | 'position' | 'title' | 'amount'>[],
    freelancerAddress: string,
  ): Promise<Escrow> {
    const total = milestones.reduce(
      (sum, m) => sum.add(m.amount),
      new Prisma.Decimal(0),
    );

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
    });
    const fund = await this.chain.fundEscrow(
      deploy.contractId,
      total.toString(),
    );

    const escrow = await this.prisma.escrow.create({
      data: {
        type: 'contract',
        status: 'funded',
        trustlessWorkId: deploy.contractId,
        fundedAmount: total,
      },
    });
    await this.prisma.transaction.create({
      data: {
        operation: 'fund',
        amount: total,
        stellarHash: fund.txHash,
        confirmedAt: new Date(),
      },
    });
    return escrow;
  }

  /** Record delivered work on-chain as milestone evidence (best effort). */
  async submitMilestoneEvidence(
    escrow: Escrow,
    milestone: Milestone,
    evidence: string,
  ): Promise<void> {
    if (!escrow.trustlessWorkId) return;
    try {
      await this.chain.markMilestoneDone(
        escrow.trustlessWorkId,
        milestone.position,
        evidence,
      );
    } catch (error) {
      // Evidence marking must not block the deliverable submission itself.
      this.logger.warn(
        `Failed to mark milestone ${milestone.id} done on-chain: ${String(error)}`,
      );
    }
  }

  /**
   * Approve + release a milestone's funds to the freelancer (docs §3:
   * "Liberación automática de fondos al aprobar cada milestone").
   */
  async releaseMilestoneFunds(
    escrow: Escrow,
    milestone: Milestone,
  ): Promise<string> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Escrow has no on-chain contract id');
    }
    await this.chain.approveMilestone(
      escrow.trustlessWorkId,
      milestone.position,
    );
    const release = await this.chain.releaseMilestone(
      escrow.trustlessWorkId,
      milestone.position,
    );

    const released = (escrow.releasedAmount ?? new Prisma.Decimal(0)).add(
      milestone.amount,
    );
    const fullyReleased =
      escrow.fundedAmount !== null && released.gte(escrow.fundedAmount);

    await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          operation: 'release',
          amount: milestone.amount,
          stellarHash: release.txHash,
          confirmedAt: new Date(),
          milestoneId: milestone.id,
        },
      }),
      this.prisma.escrow.update({
        where: { id: escrow.id },
        data: {
          releasedAmount: released,
          status: fullyReleased ? 'released' : 'funded',
        },
      }),
    ]);
    return release.txHash;
  }

  /** Flag a milestone as disputed on-chain; funds stay locked. */
  async disputeMilestone(
    escrow: Escrow,
    milestone: Milestone,
  ): Promise<string> {
    if (!escrow.trustlessWorkId) {
      throw new NotFoundException('Escrow has no on-chain contract id');
    }
    const result = await this.chain.disputeMilestone(
      escrow.trustlessWorkId,
      milestone.position,
    );
    await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: 'disputed' },
    });
    return result.txHash;
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
    const distributions: [string, string][] = [];
    if (distribution.freelancerAmount.gt(0)) {
      distributions.push([
        distribution.freelancerAddress,
        distribution.freelancerAmount.toString(),
      ]);
    }
    if (distribution.companyAmount.gt(0)) {
      distributions.push([
        distribution.companyAddress,
        distribution.companyAmount.toString(),
      ]);
    }

    const result = await this.chain.resolveDispute(
      escrow.trustlessWorkId,
      milestone.position,
      distributions,
    );

    const released = (escrow.releasedAmount ?? new Prisma.Decimal(0)).add(
      milestone.amount,
    );
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
        data: {
          releasedAmount: released,
          status: fullyReleased ? 'released' : 'funded',
        },
      }),
    ]);
    return result.txHash;
  }

  // -- Payroll escrows ----------------------------------------------------------

  /** Deploy + fund the escrow that backs one payroll cycle. */
  async createAndFundPayrollEscrow(
    payrollId: string,
    payrollName: string,
    items: Pick<
      PayrollItem,
      'id' | 'recipientAddress' | 'recipientLabel' | 'amount'
    >[],
  ): Promise<Escrow> {
    const total = items.reduce(
      (sum, i) => sum.add(i.amount),
      new Prisma.Decimal(0),
    );

    const deploy = await this.chain.deployMultiRelease({
      engagementId: `payroll-${payrollId}-${Date.now()}`,
      title: `Payroll: ${payrollName}`,
      description: `BolPay payroll escrow (${items.length} recipients)`,
      milestones: items.map((item) => ({
        description: item.recipientLabel ?? item.recipientAddress,
        amount: item.amount.toNumber(),
        receiver: item.recipientAddress,
      })),
    });
    const fund = await this.chain.fundEscrow(
      deploy.contractId,
      total.toString(),
    );

    const escrow = await this.prisma.escrow.create({
      data: {
        type: 'payroll',
        status: 'funded',
        trustlessWorkId: deploy.contractId,
        fundedAmount: total,
      },
    });
    await this.prisma.transaction.create({
      data: {
        operation: 'fund',
        amount: total,
        stellarHash: fund.txHash,
        confirmedAt: new Date(),
      },
    });
    return escrow;
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

  // -- Queries -------------------------------------------------------------------

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
