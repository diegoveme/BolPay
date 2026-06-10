import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ContractStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../../common/types/auth';
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

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly notifications: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // -- Lifecycle: draft → pending_acceptance → accepted → active → completed ----

  async create(user: AuthUser, dto: CreateContractDto) {
    const company = await this.requireCompanyProfile(user.id);
    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { id: dto.freelancerId },
    });
    if (!freelancer) throw new NotFoundException('Freelancer not found');

    const totalAmount = dto.milestones.reduce(
      (sum, m) => sum.add(new Prisma.Decimal(m.amount)),
      new Prisma.Decimal(0),
    );

    const contract = await this.prisma.contract.create({
      data: {
        companyId: company.id,
        freelancerId: freelancer.id,
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
    return contract;
  }

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
      `Nueva propuesta de contrato: "${updated.title}" de ${updated.company.name}`,
      { contractId: updated.id },
    );
    await this.activityLogs.record(user.id, 'contract.sent', {
      contractId: id,
    });
    return updated;
  }

  /**
   * Freelancer accepts. The escrow is deployed and funded automatically; only
   * then does the contract become active (docs §2).
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

    const escrow = await this.escrowService.createAndFundContractEscrow(
      contract.id,
      contract.title,
      contract.description,
      contract.milestones,
      freelancerAddress,
    );

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: 'active',
        acceptedAt: new Date(),
        escrowId: escrow.id,
      },
      include: CONTRACT_INCLUDE,
    });

    await this.notifications.notify(
      updated.company.userId,
      'contract_accepted',
      `${updated.freelancer.displayName} aceptó el contrato "${updated.title}". Escrow fondeado.`,
      { contractId: updated.id, escrowId: escrow.id },
    );
    await this.activityLogs.record(user.id, 'contract.accepted', {
      contractId: id,
    });
    await this.activityLogs.record(updated.company.userId, 'escrow.funded', {
      contractId: id,
      escrowId: escrow.id,
      trustlessWorkId: escrow.trustlessWorkId,
    });
    return updated;
  }

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
      `${updated.freelancer.displayName} rechazó el contrato "${updated.title}"`,
      { contractId: id },
    );
    await this.activityLogs.record(user.id, 'contract.rejected', {
      contractId: id,
    });
    return updated;
  }

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
      `${updated.freelancer.displayName} solicitó cambios en "${updated.title}"`,
      { contractId: id, note: dto.note ?? null },
    );
    await this.activityLogs.record(user.id, 'contract.changes_requested', {
      contractId: id,
    });
    return updated;
  }

  // -- Queries -------------------------------------------------------------------

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
