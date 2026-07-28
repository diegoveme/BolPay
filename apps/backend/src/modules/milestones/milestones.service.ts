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
import { ContractsService } from '../contracts/contracts.service';
import { DisputesService } from '../disputes/disputes.service';
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

/**
 * Milestone states a freelancer can submit work for. Only 'pending': once a
 * deliverable is submitted the milestone is 'submitted' and the freelancer must
 * wait for the company to approve or request changes (which sends it back to
 * 'pending') before submitting again. No silent re-uploads over a pending review.
 */
const SUBMITTABLE: MilestoneStatus[] = ['pending'];
/** Milestone states a company can review. */
const REVIEWABLE: MilestoneStatus[] = ['submitted', 'in_review'];

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly notifications: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
    private readonly contracts: ContractsService,
    private readonly disputes: DisputesService,
  ) {}

  /** Load a milestone, ensuring the requester is a party to its contract. */
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

    // The on-chain "Completed" mark is signed by the freelancer themselves (TW
    // requires the serviceProvider to sign it). The client does that via
    // prepareDeliver just BEFORE this save, so a rejected signature never leaves
    // a submitted-but-unmarked milestone; simulated mode skips signing.

    await this.notifications.notify(
      milestone.contract.company.userId,
      'deliverable_submitted',
      `New deliverable (v${nextVersion}) on "${milestone.title}" - ${milestone.contract.title}`,
      { contractId: milestone.contractId, milestoneId: id },
    );
    await this.activityLogs.record(user.id, 'deliverable.submitted', {
      milestoneId: id,
      version: nextVersion,
    });
    return deliverable;
  }

  /**
   * Build the change-status XDR for the freelancer to sign, marking the
   * milestone delivered on-chain. The client signs this BEFORE saving the
   * deliverable (so a rejected signature records nothing); the on-chain
   * evidence therefore falls back to a generic "delivered" when no prior
   * deliverable exists. In simulated mode `deliverXdr` is null and the client
   * skips signing.
   */
  async prepareDeliver(id: string, user: AuthUser) {
    const milestone = await this.load(id);
    if (milestone.contract.freelancer.userId !== user.id) {
      throw new ForbiddenException(
        'Only the assigned freelancer can mark delivery',
      );
    }
    const escrow = milestone.contract.escrow;
    if (!escrow) throw new BadRequestException('Contract has no escrow');
    const freelancerAddress = milestone.contract.freelancer.user.stellarAddress;
    if (!freelancerAddress) {
      throw new BadRequestException('Connect your wallet to mark delivery');
    }
    // While a dispute is agreed but not yet settled, the milestone is still
    // "disputed" on-chain and Trustless Work rejects a status change on it. The
    // deliverable uploaded now is DB evidence only; the on-chain settlement is
    // the platform's resolve-milestone-dispute at approval, which does not need
    // the milestone marked delivered. So there is nothing to sign here.
    const agreedDisputes = await this.prisma.dispute.count({
      where: { milestoneId: id, status: 'agreed' },
    });
    if (agreedDisputes > 0) return { deliverXdr: null };
    const latest = milestone.deliverables[0];
    const evidence =
      latest?.linkUrl ?? latest?.fileUrl ?? latest?.note ?? 'delivered';
    return this.escrowService.prepareMilestoneDeliver(
      escrow,
      milestone,
      freelancerAddress,
      evidence,
    );
  }

  // -- Approve (company signs) + release (platform executes) -------------------

  /** Step 1: build the APPROVE XDR for the company to sign. */
  async prepareApprove(id: string, user: AuthUser) {
    const milestone = await this.load(id);
    this.assertCompanyOwner(milestone, user);
    if (!REVIEWABLE.includes(milestone.status)) {
      throw new BadRequestException(
        `Cannot approve a milestone in status "${milestone.status}"`,
      );
    }
    const escrow = milestone.contract.escrow;
    if (!escrow || escrow.status !== 'funded') {
      throw new BadRequestException(
        'Fund the escrow before approving milestones',
      );
    }
    const companyAddress = milestone.contract.company.user.stellarAddress;
    if (!companyAddress) {
      throw new BadRequestException('Connect your wallet to approve');
    }
    // A milestone settled by an agreed dispute is resolved by the PLATFORM (the
    // dispute resolver), not by a company-signed milestone approval, so there is
    // nothing for the company to sign; confirm runs the agreed split.
    const agreedDisputes = await this.prisma.dispute.count({
      where: { milestoneId: id, status: 'agreed' },
    });
    if (agreedDisputes > 0) return { approveXdr: null };
    return this.escrowService.prepareMilestoneApprove(
      escrow,
      milestone,
      companyAddress,
    );
  }

  /**
   * Step 2: after the company signed the approve on-chain, the PLATFORM
   * executes the release to the freelancer and the payout is recorded. The
   * company signs a single transaction (the approval); it never signs the
   * release. TW only lets the release run once the milestone is approved
   * on-chain, so this cannot pay out without a real approval.
   */
  async confirmApprove(id: string, user: AuthUser) {
    const milestone = await this.load(id);
    this.assertCompanyOwner(milestone, user);
    if (milestone.status === 'released') return this.load(id); // idempotent
    if (!REVIEWABLE.includes(milestone.status)) {
      throw new BadRequestException(
        `Cannot approve a milestone in status "${milestone.status}"`,
      );
    }
    const escrow = milestone.contract.escrow;
    if (!escrow) throw new BadRequestException('Contract has no funded escrow');

    // Atomic claim BEFORE the on-chain release: only one concurrent approval
    // flips submitted/in_review -> released. A second call claims 0 rows and
    // aborts, so the milestone can never be released (and paid) twice. If the
    // release below throws, the exception propagates so the operator can recover.
    const claimed = await this.prisma.milestone.updateMany({
      where: { id, status: { in: ['submitted', 'in_review'] } },
      data: { status: 'released' },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException(
        `Cannot approve a milestone in status "${milestone.status}"`,
      );
    }

    // If an agreed dispute is riding on this milestone, the company's approval
    // settles that agreed split (executed by the platform as dispute resolver)
    // instead of a full release to the freelancer. Returns null for a normal
    // milestone, in which case we release the full amount as usual.
    const disputeTxHash = await this.disputes.settleAgreedForMilestone(
      id,
      user.id,
    );
    const hash =
      disputeTxHash ??
      (await this.escrowService.releaseMilestoneAsPlatform(escrow, milestone));

    const latest = milestone.deliverables[0];
    if (latest) {
      await this.prisma.deliverable.update({
        where: { id: latest.id },
        data: { status: 'approved' },
      });
    }

    const freelancerUserId = milestone.contract.freelancer.userId;
    await this.notifications.notify(
      freelancerUserId,
      'deliverable_approved',
      `Your deliverable for "${milestone.title}" was approved`,
      { contractId: milestone.contractId, milestoneId: id },
    );
    // The dispute settlement announces its own split payout, so the generic
    // full-amount payment notice only applies to a normal release.
    if (!disputeTxHash) {
      await this.notifications.notify(
        freelancerUserId,
        'payment_released',
        `Payment released: ${milestone.amount.toString()} USDC for "${milestone.title}"`,
        { contractId: milestone.contractId, milestoneId: id, txHash: hash },
      );
    }
    await this.activityLogs.record(user.id, 'milestone.approved', {
      milestoneId: id,
    });
    if (!disputeTxHash) {
      await this.activityLogs.record(user.id, 'payment.released', {
        milestoneId: id,
        amount: milestone.amount.toString(),
        txHash: hash,
      });
    }

    await this.contracts.completeIfAllReleased(milestone.contractId);
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
      `Changes requested on "${milestone.title}" - ${milestone.contract.title}`,
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

  /** Load a milestone by id with its relations, or 404. */
  private async load(id: string): Promise<LoadedMilestone> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id },
      include: MILESTONE_INCLUDE,
    });
    if (!milestone) throw new NotFoundException('Milestone not found');
    return milestone;
  }

  /** Guard: the caller must be a party to the contract (or an administrator). */
  private assertParty(milestone: LoadedMilestone, user: AuthUser) {
    const isParty =
      milestone.contract.company.userId === user.id ||
      milestone.contract.freelancer.userId === user.id;
    if (!isParty && user.role !== 'administrator') {
      throw new ForbiddenException('You are not a party to this contract');
    }
  }

  /** Guard: only the contract's company (or an administrator) may review milestones. */
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
}
