/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest asymmetric matchers are typed as any */
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MilestonesService } from './milestones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ContractsService } from '../contracts/contracts.service';
import type { AuthUser } from '../../common/types/auth';

const freelancerUser: AuthUser = {
  id: 'freelancer-user',
  email: 'f@x.com',
  role: 'freelancer',
};

function milestoneFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    contractId: 'c1',
    position: 0,
    title: 'Design',
    amount: new Prisma.Decimal('500'),
    status: 'submitted',
    deliverables: [{ id: 'd1', version: 1, status: 'submitted' }],
    contract: {
      id: 'c1',
      title: 'Project',
      status: 'active',
      company: { userId: 'company-user', user: { id: 'company-user' } },
      freelancer: {
        userId: 'freelancer-user',
        user: { id: 'freelancer-user' },
      },
      escrow: { id: 'e1', status: 'funded', trustlessWorkId: 'CABC' },
      milestones: [{ id: 'm1', status: 'submitted' }],
    },
    ...overrides,
  };
}

describe('MilestonesService', () => {
  let service: MilestonesService;
  const prisma = {
    milestone: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    deliverable: { create: jest.fn(), update: jest.fn() },
    contract: { update: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([{ id: 'd2', version: 2 }]),
  };
  const escrow = {};
  const notifications = { notify: jest.fn() };
  const activityLogs = { record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([{ id: 'd2', version: 2 }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MilestonesService,
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
    service = moduleRef.get(MilestonesService);
  });

  it('submitDeliverable versions the upload and notifies the company', async () => {
    prisma.milestone.findUnique.mockResolvedValue(
      milestoneFixture({ status: 'pending' }),
    );

    await service.submitDeliverable('m1', freelancerUser, {
      linkUrl: 'https://github.com/org/repo/pull/1',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledWith(
      'company-user',
      'deliverable_submitted',
      expect.stringContaining('v2'),
      expect.anything(),
    );
  });

  it('rejects an empty deliverable', async () => {
    await expect(
      service.submitDeliverable('m1', freelancerUser, {}),
    ).rejects.toThrow('Provide a fileUrl, linkUrl or note');
  });
});
