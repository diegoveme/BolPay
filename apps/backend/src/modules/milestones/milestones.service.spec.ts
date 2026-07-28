/** Unit tests for MilestonesService: deliverable submission, review and release. */
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MilestonesService } from './milestones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ContractsService } from '../contracts/contracts.service';
import { DisputesService } from '../disputes/disputes.service';
import type { AuthUser } from '../../common/types/auth';

const freelancerUser: AuthUser = {
  id: 'freelancer-user',
  email: 'f@x.com',
  role: 'freelancer',
};
const companyUser: AuthUser = {
  id: 'company-user',
  email: 'c@x.com',
  role: 'company',
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
      updateMany: jest.fn(),
    },
    deliverable: { create: jest.fn(), update: jest.fn() },
    dispute: { count: jest.fn() },
    contract: { update: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([{ id: 'd2', version: 2 }]),
  };
  const escrow = {
    releaseMilestoneAsPlatform: jest.fn().mockResolvedValue('TXREL'),
  };
  const notifications = { notify: jest.fn() };
  const activityLogs = { record: jest.fn() };
  const contracts = { completeIfAllReleased: jest.fn() };
  const disputes = { settleAgreedForMilestone: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([{ id: 'd2', version: 2 }]);
    prisma.milestone.updateMany.mockResolvedValue({ count: 1 });
    escrow.releaseMilestoneAsPlatform.mockResolvedValue('TXREL');
    // No agreed dispute by default: approvals take the normal release path.
    disputes.settleAgreedForMilestone.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        MilestonesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EscrowService, useValue: escrow },
        { provide: NotificationsService, useValue: notifications },
        { provide: ActivityLogsService, useValue: activityLogs },
        { provide: ContractsService, useValue: contracts },
        { provide: DisputesService, useValue: disputes },
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

  it('confirmApprove releases the full amount for a normal milestone', async () => {
    prisma.milestone.findUnique.mockResolvedValue(milestoneFixture());

    await service.confirmApprove('m1', companyUser);

    expect(disputes.settleAgreedForMilestone).toHaveBeenCalledWith(
      'm1',
      'company-user',
    );
    expect(escrow.releaseMilestoneAsPlatform).toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledWith(
      'freelancer-user',
      'payment_released',
      expect.any(String),
      expect.anything(),
    );
  });

  it('confirmApprove settles the agreed dispute split instead of a full release', async () => {
    prisma.milestone.findUnique.mockResolvedValue(milestoneFixture());
    disputes.settleAgreedForMilestone.mockResolvedValue('TXDISPUTE');

    await service.confirmApprove('m1', companyUser);

    expect(escrow.releaseMilestoneAsPlatform).not.toHaveBeenCalled();
    // The dispute settlement announces its own split; no generic payment notice.
    expect(notifications.notify).not.toHaveBeenCalledWith(
      'freelancer-user',
      'payment_released',
      expect.any(String),
      expect.anything(),
    );
  });
});
