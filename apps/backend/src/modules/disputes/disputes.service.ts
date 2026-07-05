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
   * Accept the standing proposal and execute its split on-chain. Only the party
   * that did NOT make the current proposal can accept it - that is what makes
   * the resolution mutual. Without a proposal there is nothing to accept.
   */
  async accept(id: string, user: AuthUser) {
    const dispute = await this.load(id);
    this.assertParticipant(dispute, user);
    if (['resolved', 'closed'].includes(dispute.status)) {
      throw new BadRequestException('Dispute is already resolved');
    }
    if (!dispute.proposedById || !dispute.proposalOutcome) {
      throw new BadRequestException('There is no resolution proposal to accept');
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

    // Settle exactly the agreed proposal (already validated at propose time).
    const freelancerAmount =
      dispute.proposalFreelancerAmount ?? new Prisma.Decimal(0);
    const companyAmount =
      dispute.proposalCompanyAmount ?? new Prisma.Decimal(0);

    // Atomic claim BEFORE the on-chain resolution: only the first accept flips
    // the dispute out of an open state (notIn resolved/closed), so a concurrent
    // second accept claims 0 rows and aborts and the escrow settles once. If the
    // on-chain call then fails we revert the claim (below) so it stays retryable
    // instead of bricking the dispute as "resolved" with no payout.
    const previousStatus = dispute.status;
    const claimed = await this.prisma.dispute.updateMany({
      where: { id, status: { notIn: ['resolved', 'closed'] } },
      data: {
        status: 'resolved',
        outcome: dispute.proposalOutcome,
        freelancerAmount,
        companyAmount,
        resolution: dispute.proposalNote,
        resolvedById: user.id,
        resolvedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Dispute is already resolved');
    }

    let txHash: string;
    try {
      txHash = await this.escrowService.resolveMilestoneDispute(escrow, milestone, {
        freelancerAddress,
        freelancerAmount,
        companyAddress,
        companyAmount,
      });
    } catch (err) {
      // Release the claim so a failed settlement can be retried. Only the status
      // is reverted; the stale resolution fields are overwritten on the retry.
      await this.prisma.dispute.update({
        where: { id },
        data: { status: previousStatus },
      });
      throw err;
    }

    await this.prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: 'released' },
    });
    const updated = await this.load(id);

    const message = `Dispute on "${milestone.title}" resolved: ${freelancerAmount.toString()} USDC to the freelancer, ${companyAmount.toString()} USDC to the company`;
    await Promise.all([
      this.notifications.notify(
        contract.company.userId,
        'dispute_resolved',
        message,
        { disputeId: id, txHash },
      ),
      this.notifications.notify(
        contract.freelancer.userId,
        'dispute_resolved',
        message,
        { disputeId: id, txHash },
      ),
    ]);
    await this.activityLogs.record(user.id, 'dispute.resolved', {
      disputeId: id,
      outcome: dispute.proposalOutcome,
      txHash,
    });

    await this.contracts.completeIfAllReleased(contract.id);
    return updated;
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
