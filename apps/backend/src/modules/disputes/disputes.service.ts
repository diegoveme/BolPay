import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  EscrowService,
  type DisputeDistribution,
} from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractsService } from '../contracts/contracts.service';
import type { AuthUser } from '../../common/types/auth';
import {
  AddEvidenceDto,
  OpenDisputeDto,
  ProposeResolutionDto,
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
  proposedBy: { select: { id: true, email: true, role: true } },
  resolvedBy: { select: { id: true, email: true, role: true } },
} satisfies Prisma.DisputeInclude;

type LoadedDispute = Prisma.DisputeGetPayload<{
  include: typeof DISPUTE_INCLUDE;
}>;

const DISPUTE_MILESTONE_INCLUDE = {
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
  // Any dispute still in play (not resolved/closed) blocks opening a new one -
  // including an 'agreed' one whose milestone has already reopened for delivery.
  disputes: {
    where: { status: { notIn: ['resolved', 'closed'] } },
    select: { id: true },
  },
} satisfies Prisma.MilestoneInclude;

type DisputeMilestone = Prisma.MilestoneGetPayload<{
  include: typeof DISPUTE_MILESTONE_INCLUDE;
}>;

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly notifications: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
    private readonly contracts: ContractsService,
  ) {}

  /**
   * Step 1: build the dispute XDR for the opening PARTY to sign (TW only lets a
   * party open a dispute). null = simulated mode (the client skips signing).
   */
  async prepareOpen(user: AuthUser, dto: OpenDisputeDto) {
    const milestone = await this.loadMilestoneForDispute(dto.milestoneId);
    this.assertCanOpen(milestone, user);
    const isCompany = milestone.contract.company.user.id === user.id;
    const signerAddress = isCompany
      ? milestone.contract.company.user.stellarAddress
      : milestone.contract.freelancer.user.stellarAddress;
    if (!signerAddress) {
      throw new BadRequestException('Connect your wallet to open a dispute');
    }
    return this.escrowService.prepareDisputeOpen(
      milestone.contract.escrow!,
      milestone,
      signerAddress,
    );
  }

  /**
   * Step 2: record the dispute after the party signed it on-chain. The milestone
   * pauses and the escrow funds stay locked.
   */
  async open(user: AuthUser, dto: OpenDisputeDto) {
    const milestone = await this.loadMilestoneForDispute(dto.milestoneId);
    this.assertCanOpen(milestone, user);

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

    await this.notifications.notify(
      this.counterpartId(milestone.contract, user.id),
      'dispute_opened',
      `Dispute opened on "${milestone.title}"`,
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

    await this.notifications.notify(
      this.counterpartId(dispute.milestone.contract, user.id),
      'dispute_opened',
      `New evidence on the dispute for "${dispute.milestone.title}"`,
      { disputeId: id },
    );
    return evidence;
  }

  /**
   * Propose (or counter-propose) how the disputed milestone's funds are split.
   * The proposal becomes the standing offer; the OTHER party accepts it (via
   * accept()) or replaces it with their own. Nothing moves on-chain here, so a
   * proposal is safe and reversible until accepted.
   */
  async propose(id: string, user: AuthUser, dto: ProposeResolutionDto) {
    const dispute = await this.load(id);
    this.assertParticipant(dispute, user);
    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Dispute is already resolved');
    }

    const milestone = dispute.milestone;
    // Validate the split now so a malformed proposal never reaches the other
    // party (also the single source of truth for the amounts stored below).
    const { freelancerAmount, companyAmount } = this.computeDistribution(
      dto,
      milestone.amount,
    );

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: {
        proposalOutcome: dto.outcome,
        proposalFreelancerAmount: freelancerAmount,
        proposalCompanyAmount: companyAmount,
        proposalNote: dto.resolution,
        proposedById: user.id,
        proposedAt: new Date(),
        // Surface that a negotiation is underway (a fresh dispute is `open`).
        status: dispute.status === 'open' ? 'under_review' : dispute.status,
      },
      include: DISPUTE_INCLUDE,
    });

    await this.notifications.notify(
      this.counterpartId(milestone.contract, user.id),
      'dispute_opened',
      `New resolution proposed for "${milestone.title}"`,
      { disputeId: id, milestoneId: milestone.id },
    );
    await this.activityLogs.record(user.id, 'dispute.proposed', {
      disputeId: id,
      outcome: dto.outcome,
    });
    return updated;
  }

  /**
   * Accept the standing proposal. Only the party that did NOT make the current
   * proposal can accept it - that is what makes the resolution mutual. What
   * happens next depends on who the money goes to:
   *
   *  - Full refund to the company (the freelancer gets nothing): there is
   *    nothing to deliver, so the escrow settles immediately.
   *  - Any share to the freelancer: the split is locked in but NOT paid yet.
   *    The milestone reopens so the freelancer delivers and the company approves
   *    the work; the escrow settles that agreed split on approval (see
   *    MilestonesService.confirmApprove). The funds stay locked until then.
   */
  async accept(id: string, user: AuthUser) {
    const dispute = await this.load(id);
    this.assertParticipant(dispute, user);
    if (['agreed', 'resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Dispute is already resolved');
    }
    if (!dispute.proposedById || !dispute.proposalOutcome) {
      throw new BadRequestException(
        'There is no resolution proposal to accept',
      );
    }
    if (dispute.proposedById === user.id) {
      throw new ForbiddenException(
        'The other party must accept your proposal (or counter-propose)',
      );
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

    // The agreed proposal (already validated at propose time).
    const freelancerAmount =
      dispute.proposalFreelancerAmount ?? new Prisma.Decimal(0);
    const companyAmount =
      dispute.proposalCompanyAmount ?? new Prisma.Decimal(0);

    // The freelancer is owed a share: lock the split, reopen for delivery and
    // wait for the company's approval before any money moves.
    if (freelancerAmount.gt(0)) {
      return this.agreeAndReopen(
        dispute,
        user,
        freelancerAmount,
        companyAmount,
      );
    }

    // Pure refund to the company: settle right away, nothing to deliver.
    await this.resolveOnChain(dispute, user.id, {
      freelancerAddress,
      freelancerAmount,
      companyAddress,
      companyAmount,
    });
    await this.prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: 'released' },
    });
    await this.contracts.completeIfAllReleased(contract.id);
    return this.load(id);
  }

  /**
   * Lock in a split that pays the freelancer without moving money: the dispute
   * becomes 'agreed' and the milestone reopens (straight to 'submitted' if work
   * already exists, otherwise 'pending' so the freelancer uploads first). The
   * escrow settles later, when the company approves the delivered work.
   */
  private async agreeAndReopen(
    dispute: LoadedDispute,
    user: AuthUser,
    freelancerAmount: Prisma.Decimal,
    companyAmount: Prisma.Decimal,
  ): Promise<LoadedDispute> {
    const milestone = dispute.milestone;
    const contract = milestone.contract;
    const deliverableCount = await this.prisma.deliverable.count({
      where: { milestoneId: milestone.id },
    });
    const reopenStatus = deliverableCount > 0 ? 'submitted' : 'pending';

    // Atomic claim: only the first accept locks the agreement (a concurrent
    // second accept claims 0 rows and aborts). No on-chain call happens here.
    const claimed = await this.prisma.dispute.updateMany({
      where: {
        id: dispute.id,
        status: { notIn: ['agreed', 'resolved', 'closed'] },
      },
      data: {
        status: 'agreed',
        outcome: dispute.proposalOutcome,
        freelancerAmount,
        companyAmount,
        resolution: dispute.proposalNote,
      },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Dispute is already resolved');
    }
    await this.prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: reopenStatus },
    });

    const summary = `Agreement reached on "${milestone.title}": ${freelancerAmount.toString()} USDC to the freelancer and ${companyAmount.toString()} USDC to the company once the work is delivered and approved`;
    await Promise.all([
      // Deep-link both parties to the contract, where the work is uploaded and
      // approved (no disputeId, so the notification opens the contract page).
      this.notifications.notify(
        contract.freelancer.userId,
        'dispute_opened',
        `${summary}. Upload your deliverable to proceed.`,
        { contractId: contract.id, milestoneId: milestone.id },
      ),
      this.notifications.notify(
        contract.company.userId,
        'dispute_opened',
        summary,
        { contractId: contract.id, milestoneId: milestone.id },
      ),
    ]);
    await this.activityLogs.record(user.id, 'dispute.agreed', {
      disputeId: dispute.id,
      outcome: dispute.proposalOutcome,
    });
    return this.load(dispute.id);
  }

  /**
   * Settle a milestone's agreed dispute when the company approves the delivered
   * work. Returns the settlement tx hash, or null when the milestone has no
   * agreed dispute (a normal, non-dispute release). Called by
   * MilestonesService.confirmApprove.
   */
  async settleAgreedForMilestone(
    milestoneId: string,
    approverUserId: string,
  ): Promise<string | null> {
    const dispute = await this.prisma.dispute.findFirst({
      where: { milestoneId, status: 'agreed' },
      include: DISPUTE_INCLUDE,
    });
    if (!dispute) return null;
    const contract = dispute.milestone.contract;
    const freelancerAddress = contract.freelancer.user.stellarAddress;
    const companyAddress = contract.company.user.stellarAddress;
    if (!freelancerAddress || !companyAddress) {
      throw new BadRequestException(
        'Both parties must have a linked Stellar wallet',
      );
    }
    return this.resolveOnChain(dispute, approverUserId, {
      freelancerAddress,
      freelancerAmount: dispute.freelancerAmount ?? new Prisma.Decimal(0),
      companyAddress,
      companyAmount: dispute.companyAmount ?? new Prisma.Decimal(0),
    });
  }

  /**
   * Claim the dispute as resolved, execute the agreed split on the escrow and
   * announce it to both parties. Reverts the claim if the on-chain settlement
   * fails so it stays retryable instead of bricking the dispute as "resolved"
   * with no payout. Returns the settlement tx hash. The CALLER owns the
   * milestone status and contract-completion side effects.
   */
  private async resolveOnChain(
    dispute: LoadedDispute,
    resolvedByUserId: string,
    distribution: DisputeDistribution,
  ): Promise<string> {
    const milestone = dispute.milestone;
    const contract = milestone.contract;
    const previousStatus = dispute.status;

    // Atomic claim BEFORE the on-chain resolution: only the first caller flips
    // the dispute out of a live state, so a concurrent second call claims 0 rows
    // and the escrow settles exactly once.
    const claimed = await this.prisma.dispute.updateMany({
      where: { id: dispute.id, status: { notIn: ['resolved', 'closed'] } },
      data: {
        status: 'resolved',
        outcome: dispute.proposalOutcome,
        freelancerAmount: distribution.freelancerAmount,
        companyAmount: distribution.companyAmount,
        resolution: dispute.proposalNote,
        resolvedById: resolvedByUserId,
        resolvedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Dispute is already resolved');
    }

    let txHash: string;
    try {
      txHash = await this.escrowService.resolveMilestoneDispute(
        contract.escrow!,
        milestone,
        distribution,
      );
    } catch (err) {
      // Release the claim so a failed settlement can be retried. Only the status
      // is reverted; the stale resolution fields are overwritten on the retry.
      await this.prisma.dispute.update({
        where: { id: dispute.id },
        data: { status: previousStatus },
      });
      throw err;
    }

    const message = `Dispute on "${milestone.title}" resolved: ${distribution.freelancerAmount.toString()} USDC to the freelancer, ${distribution.companyAmount.toString()} USDC to the company`;
    await Promise.all([
      this.notifications.notify(
        contract.company.userId,
        'dispute_resolved',
        message,
        { disputeId: dispute.id, txHash },
      ),
      this.notifications.notify(
        contract.freelancer.userId,
        'dispute_resolved',
        message,
        { disputeId: dispute.id, txHash },
      ),
    ]);
    await this.activityLogs.record(resolvedByUserId, 'dispute.resolved', {
      disputeId: dispute.id,
      outcome: dispute.proposalOutcome,
      txHash,
    });
    return txHash;
  }

  // -- Queries -------------------------------------------------------------------

  /** List disputes: all for administrators, only the user's own otherwise. */
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

  /** Fetch a single dispute, restricted to its participants (or any admin). */
  async findById(id: string, user: AuthUser) {
    const dispute = await this.load(id);
    if (user.role !== 'administrator') this.assertParticipant(dispute, user);
    return dispute;
  }

  // -- Helpers -------------------------------------------------------------------

  /** Load a dispute by id with its relations, or 404. */
  private async load(id: string): Promise<LoadedDispute> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: DISPUTE_INCLUDE,
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  /** Load the milestone (with contract and parties) a dispute targets, or 404. */
  private async loadMilestoneForDispute(
    milestoneId: string,
  ): Promise<DisputeMilestone> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: DISPUTE_MILESTONE_INCLUDE,
    });
    if (!milestone) throw new NotFoundException('Milestone not found');
    return milestone;
  }

  /**
   * Guard: only a party may open a dispute, and only on an active contract with
   * a funded escrow and a milestone that is not already released or disputed.
   */
  private assertCanOpen(milestone: DisputeMilestone, user: AuthUser) {
    const isParty =
      milestone.contract.company.user.id === user.id ||
      milestone.contract.freelancer.user.id === user.id;
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
    // Covers an 'agreed' dispute too: its milestone has reopened for delivery
    // (so the status check above no longer catches it) but it is not settled.
    if (milestone.disputes.length > 0) {
      throw new BadRequestException(
        'This milestone already has an open dispute',
      );
    }
    if (!milestone.contract.escrow) {
      throw new BadRequestException('Contract has no funded escrow');
    }
  }

  /** Guard: the caller must be the company or the freelancer on the dispute. */
  private assertParticipant(dispute: LoadedDispute, user: AuthUser) {
    const contract = dispute.milestone.contract;
    const isParty =
      contract.company.userId === user.id ||
      contract.freelancer.userId === user.id;
    if (!isParty)
      throw new ForbiddenException('You are not a party to this dispute');
  }

  /** The other party (company <-> freelancer) to notify about an action. */
  private counterpartId(
    contract: { company: { userId: string }; freelancer: { userId: string } },
    userId: string,
  ): string {
    return contract.company.userId === userId
      ? contract.freelancer.userId
      : contract.company.userId;
  }

  /** Translate a proposed outcome into on-chain distribution amounts. */
  private computeDistribution(
    dto: ProposeResolutionDto,
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
}
