/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest asymmetric matchers are typed as any */
/** Unit tests for DisputesService: mutual propose/accept resolution flow. */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DisputesService } from './disputes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ContractsService } from '../contracts/contracts.service';
import type { AuthUser } from '../../common/types/auth';

const company: AuthUser = {
  id: 'company-user',
  email: 'c@x.com',
  role: 'company',
};
const freelancer: AuthUser = {
  id: 'freelancer-user',
  email: 'f@x.com',
  role: 'freelancer',
};
const G = (c: string) => c + 'B'.repeat(55);

/** A standing proposal made by the company, awaiting the freelancer's accept. */
const companyProposal = {
  status: 'under_review',
  proposedById: 'company-user',
  proposalOutcome: 'release_to_freelancer',
  proposalFreelancerAmount: new Prisma.Decimal('500'),
  proposalCompanyAmount: new Prisma.Decimal('0'),
  proposalNote: null,
};

function disputeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dp1',
    status: 'open',
    openedById: 'company-user',
    milestone: {
      id: 'm1',
      title: 'Design',
      amount: new Prisma.Decimal('500'),
      contract: {
        id: 'c1',
        title: 'Project',
        status: 'active',
        company: {
          userId: 'company-user',
          user: { id: 'company-user', stellarAddress: G('G') },
        },
        freelancer: {
          userId: 'freelancer-user',
          user: { id: 'freelancer-user', stellarAddress: G('G') },
        },
        escrow: { id: 'e1', status: 'disputed', trustlessWorkId: 'CABC' },
      },
    },
    evidence: [],
    ...overrides,
  };
}

describe('DisputesService', () => {
  let service: DisputesService;
  const prisma = {
    dispute: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    milestone: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    deliverable: { count: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    contract: { update: jest.fn() },
    disputeEvidence: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const escrow = {
    resolveMilestoneDispute: jest.fn().mockResolvedValue('TX2'),
  };
  const notifications = { notify: jest.fn() };
  const activityLogs = { record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    escrow.resolveMilestoneDispute.mockResolvedValue('TX2');
    // Atomic resolve claim succeeds by default.
    prisma.dispute.updateMany.mockResolvedValue({ count: 1 });
    // A deliverable already exists by default (milestone reopens to 'submitted').
    prisma.deliverable.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.$transaction.mockResolvedValue([
      disputeFixture({ status: 'resolved' }),
    ]);
    prisma.milestone.findMany.mockResolvedValue([{ status: 'released' }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EscrowService, useValue: escrow },
        { provide: NotificationsService, useValue: notifications },
        { provide: ActivityLogsService, useValue: activityLogs },
        {
          provide: ContractsService,
          useValue: { completeIfAllReleased: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get(DisputesService);
  });

  it('propose: the split must sum the milestone amount', async () => {
    prisma.dispute.findUnique.mockResolvedValue(disputeFixture());
    await expect(
      service.propose('dp1', company, {
        outcome: 'split',
        freelancerAmount: '100',
        companyAmount: '100',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.dispute.update).not.toHaveBeenCalled();
  });

  it('propose: stores the standing proposal and notifies the other party', async () => {
    prisma.dispute.findUnique.mockResolvedValue(disputeFixture());
    prisma.dispute.update.mockResolvedValue(disputeFixture(companyProposal));

    await service.propose('dp1', company, { outcome: 'release_to_freelancer' });

    expect(prisma.dispute.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proposalOutcome: 'release_to_freelancer',
          proposedById: 'company-user',
        }),
      }),
    );
    expect(notifications.notify).toHaveBeenCalledWith(
      'freelancer-user',
      'dispute_opened',
      expect.any(String),
      expect.any(Object),
    );
    expect(escrow.resolveMilestoneDispute).not.toHaveBeenCalled();
  });

  it('accept: rejects when there is no standing proposal', async () => {
    prisma.dispute.findUnique.mockResolvedValue(disputeFixture());
    await expect(service.accept('dp1', freelancer)).rejects.toThrow(
      BadRequestException,
    );
    expect(escrow.resolveMilestoneDispute).not.toHaveBeenCalled();
  });

  it('accept: the proposer cannot accept their own proposal (mutual)', async () => {
    prisma.dispute.findUnique.mockResolvedValue(
      disputeFixture(companyProposal),
    );
    await expect(service.accept('dp1', company)).rejects.toThrow(
      ForbiddenException,
    );
    expect(escrow.resolveMilestoneDispute).not.toHaveBeenCalled();
  });

  it('accept: a split that pays the freelancer is agreed, not paid yet', async () => {
    prisma.dispute.findUnique.mockResolvedValue(
      disputeFixture(companyProposal),
    );

    await service.accept('dp1', freelancer);

    // No money moves on accept: the split is only locked in.
    expect(escrow.resolveMilestoneDispute).not.toHaveBeenCalled();
    expect(prisma.dispute.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'agreed' }),
      }),
    );
    // A deliverable already exists, so the milestone reopens straight to review.
    expect(prisma.milestone.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'submitted' }),
      }),
    );
  });

  it('accept: with no deliverable yet, the milestone reopens to pending', async () => {
    prisma.dispute.findUnique.mockResolvedValue(
      disputeFixture(companyProposal),
    );
    prisma.deliverable.count.mockResolvedValue(0);

    await service.accept('dp1', freelancer);

    expect(prisma.milestone.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending' }),
      }),
    );
  });

  it('accept: a full refund to the company settles immediately', async () => {
    const refundProposal = {
      status: 'under_review',
      proposedById: 'company-user',
      proposalOutcome: 'refund_to_company',
      proposalFreelancerAmount: new Prisma.Decimal('0'),
      proposalCompanyAmount: new Prisma.Decimal('500'),
      proposalNote: null,
    };
    prisma.dispute.findUnique.mockResolvedValue(disputeFixture(refundProposal));

    await service.accept('dp1', freelancer);

    expect(escrow.resolveMilestoneDispute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ id: 'm1' }),
      expect.objectContaining({
        freelancerAmount: new Prisma.Decimal('0'),
        companyAmount: new Prisma.Decimal('500'),
      }),
    );
    expect(prisma.milestone.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'released' }),
      }),
    );
  });

  it('settleAgreedForMilestone: runs the agreed split when the company approves', async () => {
    prisma.dispute.findFirst.mockResolvedValue(
      disputeFixture({
        status: 'agreed',
        proposedById: 'company-user',
        proposalOutcome: 'split',
        proposalNote: 'agreed split',
        outcome: 'split',
        freelancerAmount: new Prisma.Decimal('400'),
        companyAmount: new Prisma.Decimal('100'),
      }),
    );

    const txHash = await service.settleAgreedForMilestone('m1', 'company-user');

    expect(txHash).toBe('TX2');
    expect(escrow.resolveMilestoneDispute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ id: 'm1' }),
      expect.objectContaining({
        freelancerAmount: new Prisma.Decimal('400'),
        companyAmount: new Prisma.Decimal('100'),
      }),
    );
  });

  it('settleAgreedForMilestone: returns null when no agreed dispute exists', async () => {
    prisma.dispute.findFirst.mockResolvedValue(null);

    const txHash = await service.settleAgreedForMilestone('m1', 'company-user');

    expect(txHash).toBeNull();
    expect(escrow.resolveMilestoneDispute).not.toHaveBeenCalled();
  });
});
