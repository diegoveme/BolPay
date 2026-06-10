import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MilestoneStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../../common/types/auth';
import {
  ReviewDeliverableDto,
  SubmitDeliverableDto,
} from './dto/submit-deliverable.dto';

const MILESTONE_INCLUDE = {
  contract: {
    include: {
      company: {
        include: { user: { select: { id: true, stellarAddress: true } } },
      },
      freelancer: {
        include: { user: { select: { id: true, stellarAddress: true } } },
      },
      escrow: true,
      milestones: { select: { id: true, status: true } },
    },
  },
  deliverables: { orderBy: { version: 'desc' as const } },
} satisfies Prisma.MilestoneInclude;

type LoadedMilestone = Prisma.MilestoneGetPayload<{
  include: typeof MILESTONE_INCLUDE;
}>;

/** Milestone states a freelancer can (re)submit work for. */
const SUBMITTABLE: MilestoneStatus[] = ['pending', 'submitted', 'in_review'];
/** Milestone states a company can review. */
const REVIEWABLE: MilestoneStatus[] = ['submitted', 'in_review'];

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly notifications: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async findById(id: string, user: AuthUser) {
    const milestone = await this.load(id);
    this.assertParty(milestone, user);
    return milestone;
  }

  /**
   * Freelancer uploads a deliverable (file/link, versioned). The milestone
   * moves to "submitted" and the evidence is mirrored on-chain (best effort).
   */
  async submitDeliverable(
    id: string,
    user: AuthUser,
    dto: SubmitDeliverableDto,
  ) {
    if (!dto.fileUrl && !dto.linkUrl && !dto.note) {
      throw new BadRequestException('Provide a fileUrl, linkUrl or note');
    }
    const milestone = await this.load(id);
    if (milestone.contract.freelancer.userId !== user.id) {
      throw new ForbiddenException(
        'Only the assigned freelancer can submit deliverables',
      );
    }
    if (milestone.contract.status !== 'active') {
      throw new BadRequestException('Contract is not active');
    }
    if (!SUBMITTABLE.includes(milestone.status)) {
      throw new BadRequestException(
        `Cannot submit a deliverable for a milestone in status "${milestone.status}"`,
      );
    }

    const nextVersion = (milestone.deliverables[0]?.version ?? 0) + 1;
    const [deliverable] = await this.prisma.$transaction([
      this.prisma.deliverable.create({
        data: {
          milestoneId: id,
          submittedById: user.id,
          fileUrl: dto.fileUrl,
          linkUrl: dto.linkUrl,
          note: dto.note,
          version: nextVersion,
        },
      }),
      this.prisma.milestone.update({
        where: { id },
        data: { status: 'submitted' },
      }),
    ]);

    if (milestone.contract.escrow) {
      await this.escrowService.submitMilestoneEvidence(
        milestone.contract.escrow,
        milestone,
        dto.linkUrl ?? dto.fileUrl ?? dto.note ?? 'delivered',
      );
    }

    await this.notifications.notify(
      milestone.contract.company.userId,
      'deliverable_submitted',
      `Nueva entrega (v${nextVersion}) en "${milestone.title}" — ${milestone.contract.title}`,
      { contractId: milestone.contractId, milestoneId: id },
    );
    await this.activityLogs.record(user.id, 'deliverable.submitted', {
      milestoneId: id,
      version: nextVersion,
    });
    return deliverable;
  }

  /**
   * Company approves the milestone: the latest deliverable is accepted and the
   * escrow releases the funds to the freelancer's wallet automatically.
   */
  async approve(id: string, user: AuthUser) {
    const milestone = await this.load(id);
    this.assertCompanyOwner(milestone, user);
    if (!REVIEWABLE.includes(milestone.status)) {
      throw new BadRequestException(
        `Cannot approve a milestone in status "${milestone.status}"`,
      );
    }
    const escrow = milestone.contract.escrow;
    if (!escrow) throw new BadRequestException('Contract has no funded escrow');

    // On-chain first: if the release fails the milestone stays reviewable.
    const txHash = await this.escrowService.releaseMilestoneFunds(
      escrow,
      milestone,
    );

    const latest = milestone.deliverables[0];
    await this.prisma.$transaction([
      ...(latest
        ? [
            this.prisma.deliverable.update({
              where: { id: latest.id },
              data: { status: 'approved' },
            }),
          ]
        : []),
      this.prisma.milestone.update({
        where: { id },
        data: { status: 'released' },
      }),
    ]);

    const freelancerUserId = milestone.contract.freelancer.userId;
    await this.notifications.notify(
      freelancerUserId,
      'deliverable_approved',
      `Tu entrega de "${milestone.title}" fue aprobada`,
      { contractId: milestone.contractId, milestoneId: id },
    );
    await this.notifications.notify(
      freelancerUserId,
      'payment_released',
      `Pago liberado: ${milestone.amount.toString()} USDC por "${milestone.title}"`,
      { contractId: milestone.contractId, milestoneId: id, txHash },
    );
    await this.activityLogs.record(user.id, 'milestone.approved', {
      milestoneId: id,
    });
    await this.activityLogs.record(user.id, 'payment.released', {
      milestoneId: id,
      amount: milestone.amount.toString(),
      txHash,
    });

    await this.completeContractIfDone(milestone);
    return this.load(id);
  }

  /** Company requests changes: deliverable flagged, milestone back to pending. */
  async requestChanges(id: string, user: AuthUser, dto: ReviewDeliverableDto) {
    const milestone = await this.load(id);
    this.assertCompanyOwner(milestone, user);
    if (!REVIEWABLE.includes(milestone.status)) {
      throw new BadRequestException(
        `Cannot request changes for a milestone in status "${milestone.status}"`,
      );
    }
    const latest = milestone.deliverables[0];
    if (!latest)
      throw new BadRequestException('Milestone has no deliverable to review');

    await this.prisma.$transaction([
      this.prisma.deliverable.update({
        where: { id: latest.id },
        data: { status: 'changes_requested', reviewNote: dto.note },
      }),
      this.prisma.milestone.update({
        where: { id },
        data: { status: 'pending' },
      }),
    ]);

    await this.notifications.notify(
      milestone.contract.freelancer.userId,
      'deliverable_changes_requested',
      `Cambios solicitados en "${milestone.title}" — ${milestone.contract.title}`,
      {
        contractId: milestone.contractId,
        milestoneId: id,
        note: dto.note ?? null,
      },
    );
    await this.activityLogs.record(user.id, 'milestone.changes_requested', {
      milestoneId: id,
    });
    return this.load(id);
  }

  // -- Helpers -------------------------------------------------------------------

  private async load(id: string): Promise<LoadedMilestone> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id },
      include: MILESTONE_INCLUDE,
    });
    if (!milestone) throw new NotFoundException('Milestone not found');
    return milestone;
  }

  private assertParty(milestone: LoadedMilestone, user: AuthUser) {
    const isParty =
      milestone.contract.company.userId === user.id ||
      milestone.contract.freelancer.userId === user.id;
    if (!isParty && user.role !== 'administrator') {
      throw new ForbiddenException('You are not a party to this contract');
    }
  }

  private assertCompanyOwner(milestone: LoadedMilestone, user: AuthUser) {
    if (
      milestone.contract.company.userId !== user.id &&
      user.role !== 'administrator'
    ) {
      throw new ForbiddenException(
        'Only the contract company can review milestones',
      );
    }
  }

  /** When every milestone is released the contract is completed (docs §2). */
  private async completeContractIfDone(milestone: LoadedMilestone) {
    const states = await this.prisma.milestone.findMany({
      where: { contractId: milestone.contractId },
      select: { status: true },
    });
    if (!states.every((m) => m.status === 'released')) return;

    await this.prisma.contract.update({
      where: { id: milestone.contractId },
      data: { status: 'completed', completedAt: new Date() },
    });
    const message = `Contrato "${milestone.contract.title}" completado: todos los milestones fueron liberados`;
    await this.notifications.notify(
      milestone.contract.company.userId,
      'contract_accepted',
      message,
      { contractId: milestone.contractId },
    );
    await this.notifications.notify(
      milestone.contract.freelancer.userId,
      'contract_accepted',
      message,
      { contractId: milestone.contractId },
    );
    await this.activityLogs.record(
      milestone.contract.company.userId,
      'contract.completed',
      { contractId: milestone.contractId },
    );
  }
}
