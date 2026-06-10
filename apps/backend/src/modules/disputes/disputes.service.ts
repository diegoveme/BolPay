import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../../common/types/auth';
import {
  AddEvidenceDto,
  OpenDisputeDto,
  ResolveDisputeDto,
} from './dto/dispute.dto';

const DISPUTE_INCLUDE = {
  milestone: {
    include: {
      contract: {
        include: {
          company: {
            include: { user: { select: { id: true, stellarAddress: true } } },
          },
          freelancer: {
            include: { user: { select: { id: true, stellarAddress: true } } },
          },
          escrow: true,
        },
      },
    },
  },
  evidence: {
    orderBy: { createdAt: 'asc' as const },
    include: { submittedBy: { select: { id: true, email: true, role: true } } },
  },
  openedBy: { select: { id: true, email: true, role: true } },
  resolvedBy: { select: { id: true, email: true, role: true } },
} satisfies Prisma.DisputeInclude;

type LoadedDispute = Prisma.DisputeGetPayload<{
  include: typeof DISPUTE_INCLUDE;
}>;

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly notifications: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  /**
   * Either party opens a dispute over a milestone: the milestone pauses and
   * the escrow funds stay locked on-chain (docs §5).
   */
  async open(user: AuthUser, dto: OpenDisputeDto) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: dto.milestoneId },
      include: {
        contract: {
          include: {
            company: { select: { userId: true } },
            freelancer: { select: { userId: true } },
            escrow: true,
          },
        },
      },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const isParty =
      milestone.contract.company.userId === user.id ||
      milestone.contract.freelancer.userId === user.id;
    if (!isParty)
      throw new ForbiddenException('You are not a party to this contract');

    if (milestone.contract.status !== 'active') {
      throw new BadRequestException(
        'Disputes can only be opened on active contracts',
      );
    }
    if (['released', 'disputed'].includes(milestone.status)) {
      throw new BadRequestException(
        `Cannot dispute a milestone in status "${milestone.status}"`,
      );
    }
    if (!milestone.contract.escrow) {
      throw new BadRequestException('Contract has no funded escrow');
    }

    await this.escrowService.disputeMilestone(
      milestone.contract.escrow,
      milestone,
    );

    const [dispute] = await this.prisma.$transaction([
      this.prisma.dispute.create({
        data: {
          milestoneId: milestone.id,
          openedById: user.id,
          reason: dto.reason,
        },
        include: DISPUTE_INCLUDE,
      }),
      this.prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'disputed' },
      }),
    ]);

    const counterpartId =
      milestone.contract.company.userId === user.id
        ? milestone.contract.freelancer.userId
        : milestone.contract.company.userId;
    await this.notifications.notify(
      counterpartId,
      'dispute_opened',
      `Disputa abierta sobre "${milestone.title}"`,
      { disputeId: dispute.id, milestoneId: milestone.id },
    );
    await this.activityLogs.record(user.id, 'dispute.opened', {
      disputeId: dispute.id,
      milestoneId: milestone.id,
    });
    return dispute;
  }

  /** Both parties can attach files and comments while the dispute is open. */
  async addEvidence(id: string, user: AuthUser, dto: AddEvidenceDto) {
    if (!dto.fileUrl && !dto.comment) {
      throw new BadRequestException('Provide a fileUrl or a comment');
    }
    const dispute = await this.load(id);
    this.assertParticipant(dispute, user);
    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const evidence = await this.prisma.disputeEvidence.create({
      data: {
        disputeId: id,
        submittedById: user.id,
        fileUrl: dto.fileUrl,
        comment: dto.comment,
      },
    });

    // First counterpart response moves the dispute to under_review.
    if (dispute.status === 'open' && dispute.openedById !== user.id) {
      await this.prisma.dispute.update({
        where: { id },
        data: { status: 'under_review' },
      });
    }

    const counterpartId =
      dispute.milestone.contract.company.userId === user.id
        ? dispute.milestone.contract.freelancer.userId
        : dispute.milestone.contract.company.userId;
    await this.notifications.notify(
      counterpartId,
      'dispute_opened',
      `Nueva evidencia en la disputa de "${dispute.milestone.title}"`,
      { disputeId: id },
    );
    return evidence;
  }

  /** Escalate to the platform administrators (docs §5). */
  async escalate(id: string, user: AuthUser) {
    const dispute = await this.load(id);
    this.assertParticipant(dispute, user);
    if (!['open', 'under_review'].includes(dispute.status)) {
      throw new BadRequestException(
        `Cannot escalate a dispute in status "${dispute.status}"`,
      );
    }

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: { status: 'escalated' },
      include: DISPUTE_INCLUDE,
    });

    const admins = await this.prisma.user.findMany({
      where: { role: 'administrator' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.notify(
          admin.id,
          'dispute_escalated',
          `Disputa escalada: "${updated.milestone.title}" (${updated.milestone.contract.title})`,
          { disputeId: id },
        ),
      ),
    );
    await this.activityLogs.record(user.id, 'dispute.escalated', {
      disputeId: id,
    });
    return updated;
  }

  /**
   * Execute a resolution over the escrow. Mutual path: the counterpart (not
   * the opener) accepts an outcome while the dispute is open/under review.
   * Escalated disputes are resolved by an administrator.
   */
  async resolve(id: string, user: AuthUser, dto: ResolveDisputeDto) {
    const dispute = await this.load(id);
    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const isAdmin = user.role === 'administrator';
    if (dispute.status === 'escalated' && !isAdmin) {
      throw new ForbiddenException(
        'Escalated disputes are resolved by an administrator',
      );
    }
    if (!isAdmin) {
      this.assertParticipant(dispute, user);
      if (dispute.openedById === user.id) {
        throw new ForbiddenException(
          'Mutual resolution must be accepted by the other party (or escalate to an administrator)',
        );
      }
    }

    const milestone = dispute.milestone;
    const contract = milestone.contract;
    const escrow = contract.escrow;
    if (!escrow) throw new BadRequestException('Contract has no escrow');

    const freelancerAddress = contract.freelancer.user.stellarAddress;
    const companyAddress = contract.company.user.stellarAddress;
    if (!freelancerAddress || !companyAddress) {
      throw new BadRequestException(
        'Both parties must have a linked Stellar wallet',
      );
    }

    const { freelancerAmount, companyAmount } = this.computeDistribution(
      dto,
      milestone.amount,
    );

    const txHash = await this.escrowService.resolveMilestoneDispute(
      escrow,
      milestone,
      {
        freelancerAddress,
        freelancerAmount,
        companyAddress,
        companyAmount,
      },
    );

    const [updated] = await this.prisma.$transaction([
      this.prisma.dispute.update({
        where: { id },
        data: {
          status: 'resolved',
          outcome: dto.outcome,
          freelancerAmount,
          companyAmount,
          resolution: dto.resolution,
          resolvedById: user.id,
          resolvedAt: new Date(),
        },
        include: DISPUTE_INCLUDE,
      }),
      this.prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'released' },
      }),
    ]);

    const message = `Disputa de "${milestone.title}" resuelta: ${freelancerAmount.toString()} USDC al freelancer, ${companyAmount.toString()} USDC a la empresa`;
    await Promise.all([
      this.notifications.notify(
        contract.company.userId,
        'dispute_resolved',
        message,
        {
          disputeId: id,
          txHash,
        },
      ),
      this.notifications.notify(
        contract.freelancer.userId,
        'dispute_resolved',
        message,
        {
          disputeId: id,
          txHash,
        },
      ),
    ]);
    await this.activityLogs.record(user.id, 'dispute.resolved', {
      disputeId: id,
      outcome: dto.outcome,
      txHash,
    });

    await this.completeContractIfDone(contract.id, contract.title, {
      companyUserId: contract.company.userId,
      freelancerUserId: contract.freelancer.userId,
    });
    return updated;
  }

  // -- Queries -------------------------------------------------------------------

  async list(user: AuthUser) {
    const where: Prisma.DisputeWhereInput =
      user.role === 'administrator'
        ? {}
        : {
            milestone: {
              contract: {
                OR: [
                  { company: { userId: user.id } },
                  { freelancer: { userId: user.id } },
                ],
              },
            },
          };
    return this.prisma.dispute.findMany({
      where,
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            amount: true,
            contract: { select: { id: true, title: true } },
          },
        },
        openedBy: { select: { id: true, email: true, role: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findById(id: string, user: AuthUser) {
    const dispute = await this.load(id);
    if (user.role !== 'administrator') this.assertParticipant(dispute, user);
    return dispute;
  }

  // -- Helpers -------------------------------------------------------------------

  private async load(id: string): Promise<LoadedDispute> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: DISPUTE_INCLUDE,
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  private assertParticipant(dispute: LoadedDispute, user: AuthUser) {
    const contract = dispute.milestone.contract;
    const isParty =
      contract.company.userId === user.id ||
      contract.freelancer.userId === user.id;
    if (!isParty)
      throw new ForbiddenException('You are not a party to this dispute');
  }

  /** Translate the outcome into on-chain distribution amounts. */
  private computeDistribution(
    dto: ResolveDisputeDto,
    milestoneAmount: Prisma.Decimal,
  ) {
    switch (dto.outcome) {
      case 'release_to_freelancer':
        return {
          freelancerAmount: milestoneAmount,
          companyAmount: new Prisma.Decimal(0),
        };
      case 'refund_to_company':
        return {
          freelancerAmount: new Prisma.Decimal(0),
          companyAmount: milestoneAmount,
        };
      case 'split': {
        if (!dto.freelancerAmount || !dto.companyAmount) {
          throw new BadRequestException(
            'split requires freelancerAmount and companyAmount',
          );
        }
        const freelancerAmount = new Prisma.Decimal(dto.freelancerAmount);
        const companyAmount = new Prisma.Decimal(dto.companyAmount);
        if (!freelancerAmount.add(companyAmount).eq(milestoneAmount)) {
          throw new BadRequestException(
            `Split amounts must sum the milestone amount (${milestoneAmount.toString()} USDC)`,
          );
        }
        return { freelancerAmount, companyAmount };
      }
    }
  }

  /** Mirror of MilestonesService.completeContractIfDone for the dispute path. */
  private async completeContractIfDone(
    contractId: string,
    contractTitle: string,
    parties: { companyUserId: string; freelancerUserId: string },
  ) {
    const states = await this.prisma.milestone.findMany({
      where: { contractId },
      select: { status: true },
    });
    if (states.length === 0 || !states.every((m) => m.status === 'released'))
      return;

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: 'completed', completedAt: new Date() },
    });
    const message = `Contrato "${contractTitle}" completado`;
    await Promise.all([
      this.notifications.notify(
        parties.companyUserId,
        'contract_accepted',
        message,
        {
          contractId,
        },
      ),
      this.notifications.notify(
        parties.freelancerUserId,
        'contract_accepted',
        message,
        {
          contractId,
        },
      ),
    ]);
  }
}
