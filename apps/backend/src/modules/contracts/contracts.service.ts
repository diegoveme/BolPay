import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ContractStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { EscrowService } from '../escrow/escrow.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../../common/types/auth';
import { INVITATION_TTL_DAYS } from '../../common/constants';
import { sumAmounts } from '../../common/decimal.util';
import { CreateContractDto } from './dto/create-contract.dto';
import { ReviewContractDto } from './dto/review-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

const CONTRACT_INCLUDE = {
  company: {
    include: {
      user: { select: { id: true, email: true, stellarAddress: true } },
    },
  },
  freelancer: {
    include: {
      user: { select: { id: true, email: true, stellarAddress: true } },
    },
  },
  escrow: true,
  milestones: {
    orderBy: { position: 'asc' as const },
    include: {
      deliverables: { orderBy: { version: 'desc' as const } },
      transactions: true,
      disputes: true,
    },
  },
} satisfies Prisma.ContractInclude;

/** States the company can still edit. */
const EDITABLE: ContractStatus[] = ['draft', 'changes_requested'];

/** Contract lifecycle: creation, review, acceptance and escrow funding. */
@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly notifications: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  // -- Lifecycle: draft → pending_acceptance → accepted → active → completed ----

  /** Create a contract addressed to an existing freelancer or an email invitee. */
  async create(user: AuthUser, dto: CreateContractDto) {
    const company = await this.requireCompanyProfile(user.id);

    // Two ways to address the contract: pick an existing freelancer, or invite
    // one by email. Inviting creates a pending account + invitation and sends
    // the contract straight to "pending_acceptance"; picking leaves a draft the
    // company sends when ready.
    let freelancerId: string;
    let invited: { userId: string; email: string; unclaimed: boolean } | null =
      null;

    if (dto.freelancerId) {
      const freelancer = await this.prisma.freelancerProfile.findUnique({
        where: { id: dto.freelancerId },
      });
      if (!freelancer) throw new NotFoundException('Freelancer not found');
      freelancerId = freelancer.id;
    } else if (dto.invitedEmail) {
      const resolved = await this.resolveInvitedFreelancer(dto.invitedEmail);
      freelancerId = resolved.profileId;
      invited = {
        userId: resolved.userId,
        email: resolved.email,
        unclaimed: resolved.unclaimed,
      };
    } else {
      throw new BadRequestException(
        'Provide a freelancer or an email to invite',
      );
    }

    const totalAmount = dto.milestones.reduce(
      (sum, m) => sum.add(new Prisma.Decimal(m.amount)),
      new Prisma.Decimal(0),
    );

    const contract = await this.prisma.contract.create({
      data: {
        companyId: company.id,
        freelancerId,
        status: invited ? 'pending_acceptance' : 'draft',
        title: dto.title,
        description: dto.description,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        totalAmount,
        milestones: {
          create: dto.milestones.map((m, position) => ({
            position,
            title: m.title,
            description: m.description,
            amount: new Prisma.Decimal(m.amount),
            deadline: m.deadline ? new Date(m.deadline) : undefined,
          })),
        },
      },
      include: CONTRACT_INCLUDE,
    });

    await this.activityLogs.record(user.id, 'contract.created', {
      contractId: contract.id,
      title: contract.title,
    });

    if (invited) {
      // Email the invitation link only when the account is still unclaimed.
      if (invited.unclaimed) {
        await this.sendContractInvitation(user.id, invited.email);
      }
      await this.notifications.notify(
        invited.userId,
        'contract_received',
        `New contract proposal: "${contract.title}" from ${company.name}`,
        { contractId: contract.id },
      );
      await this.activityLogs.record(user.id, 'contract.sent', {
        contractId: contract.id,
      });
    }
    return contract;
  }

  /**
   * Resolve the freelancer a contract is addressed to by email. Returns an
   * existing freelancer if one already uses that email; otherwise creates a
   * pending account (no wallet yet) that the person claims when they sign up
   * through the invitation. Rejects emails that belong to a non-freelancer.
   */
  private async resolveInvitedFreelancer(rawEmail: string) {
    const email = rawEmail.toLowerCase();
    const existing = await this.prisma.freelancerProfile.findFirst({
      where: { user: { email } },
      include: { user: { select: { id: true, stellarAddress: true } } },
    });
    if (existing) {
      return {
        profileId: existing.id,
        userId: existing.user.id,
        email,
        unclaimed: !existing.user.stellarAddress,
      };
    }

    const clash = await this.prisma.user.findUnique({ where: { email } });
    if (clash) {
      throw new BadRequestException(
        'That email already belongs to a non-freelancer account',
      );
    }

    const displayName = email.split('@')[0];
    const created = await this.prisma.user.create({
      data: {
        email,
        name: displayName,
        role: 'freelancer',
        authProvider: 'email',
        freelancerProfile: { create: { displayName } },
      },
      include: { freelancerProfile: { select: { id: true } } },
    });
    return {
      profileId: created.freelancerProfile!.id,
      userId: created.id,
      email,
      unclaimed: true,
    };
  }

  /** Reuse a pending invitation for the email or create one, then email it. */
  private async sendContractInvitation(inviterUserId: string, email: string) {
    let invitation = await this.prisma.invitation.findFirst({
      where: { email, role: 'freelancer', status: 'pending' },
    });
    if (!invitation) {
      invitation = await this.prisma.invitation.create({
        data: {
          email,
          role: 'freelancer',
          token: randomUUID(),
          invitedById: inviterUserId,
          expiresAt: new Date(
            Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      });
      await this.activityLogs.record(inviterUserId, 'invitation.sent', {
        email,
        role: 'freelancer',
      });
    }
    const webUrl = this.config.get<string>('webUrl');
    await this.mail.sendInvitation(
      email,
      `${webUrl}/accept-invite?token=${invitation.token}`,
      'freelancer',
    );
  }

  /** Replace contract fields and milestones while still editable. */
  async update(id: string, user: AuthUser, dto: UpdateContractDto) {
    const contract = await this.requireOwnedByCompany(id, user);
    if (!EDITABLE.includes(contract.status)) {
      throw new BadRequestException(
        `Cannot edit a contract in status "${contract.status}"`,
      );
    }

    const milestoneOps = dto.milestones
      ? {
          deleteMany: {},
          create: dto.milestones.map((m, position) => ({
            position,
            title: m.title,
            description: m.description,
            amount: new Prisma.Decimal(m.amount),
            deadline: m.deadline ? new Date(m.deadline) : undefined,
          })),
        }
      : undefined;

    const totalAmount = dto.milestones
      ? dto.milestones.reduce(
          (sum, m) => sum.add(new Prisma.Decimal(m.amount)),
          new Prisma.Decimal(0),
        )
      : undefined;

    return this.prisma.contract.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        totalAmount,
        milestones: milestoneOps,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  /** Company sends the draft to the freelancer for review. */
  async send(id: string, user: AuthUser) {
    const contract = await this.requireOwnedByCompany(id, user);
    if (!EDITABLE.includes(contract.status)) {
      throw new BadRequestException(
        `Cannot send a contract in status "${contract.status}"`,
      );
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: 'pending_acceptance', reviewNote: null },
      include: CONTRACT_INCLUDE,
    });

    await this.notifications.notify(
      updated.freelancer.userId,
      'contract_received',
      `New contract proposal: "${updated.title}" from ${updated.company.name}`,
      { contractId: updated.id },
    );
    await this.activityLogs.record(user.id, 'contract.sent', {
      contractId: id,
    });
    return updated;
  }

  /**
   * Freelancer accepts. The escrow contract is deployed (no funds yet) and the
   * contract moves to "accepted" (awaiting the company's funding). It only
   * becomes "active" once the company actually funds the escrow on-chain.
   */
  async accept(id: string, user: AuthUser) {
    const contract = await this.requireAssignedFreelancer(id, user);
    if (contract.status !== 'pending_acceptance') {
      throw new BadRequestException(
        'Only contracts pending acceptance can be accepted',
      );
    }
    const freelancerAddress = contract.freelancer.user.stellarAddress;
    if (!freelancerAddress) {
      throw new BadRequestException(
        'Connect your Stellar wallet before accepting contracts',
      );
    }
    const companyAddress = contract.company.user.stellarAddress;
    if (!companyAddress) {
      throw new BadRequestException(
        'The company must connect a wallet before the contract can start',
      );
    }

    // Atomic claim BEFORE deploying: flip pending_acceptance -> accepted so a
    // concurrent second accept claims 0 rows and aborts, preventing a double
    // escrow deploy. Not "active" yet: the contract waits for funding. If the
    // deploy below throws, the exception propagates and the operator sees an
    // accepted contract with no escrow (recoverable, no money lost).
    const claimed = await this.prisma.contract.updateMany({
      where: { id, status: 'pending_acceptance' },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException(
        'Only contracts pending acceptance can be accepted',
      );
    }

    // Deploy the escrow contract only (no funds moved). The COMPANY funds it
    // afterwards by signing with its own wallet - BolPay never holds the money.
    // Roles are set so the company approves+releases and the freelancer delivers.
    const escrow = await this.escrowService.deployContractEscrow(
      contract.id,
      contract.title,
      contract.description,
      contract.milestones,
      freelancerAddress,
      companyAddress,
    );

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { escrowId: escrow.id },
      include: CONTRACT_INCLUDE,
    });

    await this.notifications.notify(
      updated.company.userId,
      'contract_accepted',
      `${updated.freelancer.displayName} accepted "${updated.title}". Fund the escrow to activate payments.`,
      { contractId: updated.id, escrowId: escrow.id },
    );
    await this.activityLogs.record(user.id, 'contract.accepted', {
      contractId: id,
    });
    return updated;
  }

  /**
   * Complete a contract once every milestone has been released. Idempotent and
   * a no-op while any milestone is still outstanding (or none exist). Shared by
   * the milestone approval path and the dispute resolution path.
   */
  async completeIfAllReleased(contractId: string): Promise<void> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        company: { select: { userId: true } },
        freelancer: { select: { userId: true } },
        milestones: { select: { status: true } },
      },
    });
    if (!contract) return;
    const { milestones } = contract;
    if (
      milestones.length === 0 ||
      !milestones.every((m) => m.status === 'released')
    ) {
      return;
    }

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: 'completed', completedAt: new Date() },
    });
    const message = `Contract "${contract.title}" completed: all milestones have been released`;
    await this.notifications.notify(
      contract.company.userId,
      'contract_accepted',
      message,
      { contractId },
    );
    await this.notifications.notify(
      contract.freelancer.userId,
      'contract_accepted',
      message,
      { contractId },
    );
    await this.activityLogs.record(
      contract.company.userId,
      'contract.completed',
      { contractId },
    );
  }

  // -- Escrow funding: signed by the COMPANY with its own wallet ---------------

  private async requireCompanyContract(id: string, user: AuthUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.company.user.id !== user.id) {
      throw new ForbiddenException('You do not own this contract');
    }
    return contract;
  }

  private contractTotal(milestones: { amount: Prisma.Decimal }[]) {
    return sumAmounts(milestones);
  }

  /** Company: build the unsigned XDR to fund the escrow (it signs it itself). */
  async prepareFund(id: string, user: AuthUser) {
    const contract = await this.requireCompanyContract(id, user);
    if (!contract.escrow) {
      throw new BadRequestException('Contract has no escrow yet');
    }
    if (contract.escrow.status !== 'created') {
      throw new BadRequestException('Escrow is already funded');
    }
    const companyAddress = contract.company.user.stellarAddress;
    if (!companyAddress) {
      throw new BadRequestException('Connect your Stellar wallet to fund');
    }
    return this.escrowService.prepareContractFund(
      contract.escrow,
      companyAddress,
      this.contractTotal(contract.milestones),
    );
  }

  /** Company: record the fund after signing+submitting (or simulated). */
  async confirmFund(id: string, user: AuthUser, txHash?: string) {
    const contract = await this.requireCompanyContract(id, user);
    if (!contract.escrow) {
      throw new BadRequestException('Contract has no escrow');
    }
    if (contract.escrow.status !== 'funded') {
      const hash = await this.escrowService.confirmContractFund(
        contract.escrow,
        this.contractTotal(contract.milestones),
        txHash,
      );
      // Now that the escrow really holds the funds, the contract goes active so
      // the freelancer can start delivering.
      if (contract.status === 'accepted') {
        await this.prisma.contract.update({
          where: { id },
          data: { status: 'active' },
        });
      }
      await this.notifications.notify(
        contract.freelancer.user.id,
        'escrow_funded',
        `The escrow for "${contract.title}" has been funded. You can now submit your work.`,
        { contractId: contract.id },
      );
      await this.activityLogs.record(user.id, 'escrow.funded', {
        contractId: id,
        escrowId: contract.escrow.id,
        txHash: hash,
      });
    }
    return this.prisma.contract.findUniqueOrThrow({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
  }

  /** Freelancer rejects a pending contract, recording the reason. */
  async reject(id: string, user: AuthUser, dto: ReviewContractDto) {
    const contract = await this.requireAssignedFreelancer(id, user);
    if (contract.status !== 'pending_acceptance') {
      throw new BadRequestException(
        'Only contracts pending acceptance can be rejected',
      );
    }
    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: 'rejected', reviewNote: dto.note },
      include: CONTRACT_INCLUDE,
    });
    await this.notifications.notify(
      updated.company.userId,
      'contract_rejected',
      `${updated.freelancer.displayName} rejected the contract "${updated.title}"`,
      { contractId: id },
    );
    await this.activityLogs.record(user.id, 'contract.rejected', {
      contractId: id,
    });
    return updated;
  }

  /** Freelancer requests changes on a pending contract before accepting. */
  async requestChanges(id: string, user: AuthUser, dto: ReviewContractDto) {
    const contract = await this.requireAssignedFreelancer(id, user);
    if (contract.status !== 'pending_acceptance') {
      throw new BadRequestException(
        'Only contracts pending acceptance can receive change requests',
      );
    }
    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: 'changes_requested', reviewNote: dto.note },
      include: CONTRACT_INCLUDE,
    });
    await this.notifications.notify(
      updated.company.userId,
      'contract_changes_requested',
      `${updated.freelancer.displayName} requested changes on "${updated.title}"`,
      { contractId: id, note: dto.note ?? null },
    );
    await this.activityLogs.record(user.id, 'contract.changes_requested', {
      contractId: id,
    });
    return updated;
  }

  // -- Queries -------------------------------------------------------------------

  /** List contracts visible to the caller, scoped by role and optional status. */
  async list(user: AuthUser, status?: ContractStatus) {
    const where: Prisma.ContractWhereInput = { ...(status ? { status } : {}) };
    if (user.role === 'company') {
      const company = await this.requireCompanyProfile(user.id);
      where.companyId = company.id;
    } else if (user.role === 'freelancer') {
      const freelancer = await this.requireFreelancerProfile(user.id);
      where.freelancerId = freelancer.id;
      // Freelancers never see other parties' drafts.
      where.status = status ?? { not: 'draft' };
    } else if (user.role !== 'administrator') {
      throw new ForbiddenException('Fixed employees do not manage contracts');
    }

    return this.prisma.contract.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        freelancer: { select: { id: true, displayName: true } },
        escrow: { select: { id: true, status: true, trustlessWorkId: true } },
        milestones: { select: { id: true, status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Fetch a contract the caller is a party to (admins see all). */
  async findById(id: string, user: AuthUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const isParty =
      contract.company.userId === user.id ||
      contract.freelancer.userId === user.id;
    if (!isParty && user.role !== 'administrator') {
      throw new ForbiddenException('You are not a party to this contract');
    }
    if (
      contract.status === 'draft' &&
      contract.freelancer.userId === user.id &&
      contract.company.userId !== user.id
    ) {
      throw new NotFoundException('Contract not found');
    }
    return contract;
  }

  // -- Helpers -------------------------------------------------------------------

  private async requireCompanyProfile(userId: string) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new ForbiddenException('Company profile required');
    return profile;
  }

  private async requireFreelancerProfile(userId: string) {
    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new ForbiddenException('Freelancer profile required');
    return profile;
  }

  private async requireOwnedByCompany(id: string, user: AuthUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.company.userId !== user.id && user.role !== 'administrator') {
      throw new ForbiddenException('Only the contract owner can do this');
    }
    return contract;
  }

  private async requireAssignedFreelancer(id: string, user: AuthUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.freelancer.userId !== user.id) {
      throw new ForbiddenException('Only the assigned freelancer can do this');
    }
    return contract;
  }
}
