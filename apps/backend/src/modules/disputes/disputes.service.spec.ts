import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DisputesService } from './disputes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
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
const admin: AuthUser = {
  id: 'admin-user',
  email: 'a@x.com',
  role: 'administrator',
};

const G = (c: string) => c + 'B'.repeat(55);

function disputeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dp1',
    status: 'open',
    openedById: 'company-user',
    milestone: {
      id: 'm1',
      title: 'Diseño',
      amount: new Prisma.Decimal('500'),
      contract: {
        id: 'c1',
        title: 'Proyecto',
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
    dispute: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    milestone: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    contract: { update: jest.fn() },
    disputeEvidence: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const escrow = {
    disputeMilestone: jest.fn().mockResolvedValue('TX1'),
    resolveMilestoneDispute: jest.fn().mockResolvedValue('TX2'),
  };
  const notifications = { notify: jest.fn() };
  const activityLogs = { record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    escrow.resolveMilestoneDispute.mockResolvedValue('TX2');
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
      ],
    }).compile();
    service = moduleRef.get(DisputesService);
  });

  it('the opener cannot resolve their own dispute (mutual resolution)', async () => {
    prisma.dispute.findUnique.mockResolvedValue(disputeFixture());
    await expect(
      service.resolve('dp1', company, { outcome: 'release_to_freelancer' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('split amounts must sum the milestone amount', async () => {
    prisma.dispute.findUnique.mockResolvedValue(disputeFixture());
    await expect(
      service.resolve('dp1', freelancer, {
        outcome: 'split',
        freelancerAmount: '100',
        companyAmount: '100',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(escrow.resolveMilestoneDispute).not.toHaveBeenCalled();
  });

  it('counterpart accepting release_to_freelancer executes the full distribution', async () => {
    prisma.dispute.findUnique.mockResolvedValue(disputeFixture());

    await service.resolve('dp1', freelancer, {
      outcome: 'release_to_freelancer',
    });

    expect(escrow.resolveMilestoneDispute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ id: 'm1' }),
      expect.objectContaining({
        freelancerAmount: new Prisma.Decimal('500'),
        companyAmount: new Prisma.Decimal(0),
      }),
    );
  });

  it('escalated disputes are admin-only', async () => {
    prisma.dispute.findUnique.mockResolvedValue(
      disputeFixture({ status: 'escalated' }),
    );
    await expect(
      service.resolve('dp1', freelancer, { outcome: 'refund_to_company' }),
    ).rejects.toThrow(ForbiddenException);

    await service.resolve('dp1', admin, { outcome: 'refund_to_company' });
    expect(escrow.resolveMilestoneDispute).toHaveBeenCalledTimes(1);
  });
});
