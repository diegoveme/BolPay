/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest asymmetric matchers are typed as any */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MilestonesService } from './milestones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { AuthUser } from '../../common/types/auth';

const companyUser: AuthUser = {
  id: 'company-user',
  email: 'c@x.com',
  role: 'company',
};
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
    title: 'Diseño',
    amount: new Prisma.Decimal('500'),
    status: 'submitted',
    deliverables: [{ id: 'd1', version: 1, status: 'submitted' }],
    contract: {
      id: 'c1',
      title: 'Proyecto',
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
  const escrow = {
    releaseMilestoneFunds: jest.fn().mockResolvedValue('TXHASH'),
    submitMilestoneEvidence: jest.fn(),
  };
  const notifications = { notify: jest.fn() };
  const activityLogs = { record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([{ id: 'd2', version: 2 }]);
    escrow.releaseMilestoneFunds.mockResolvedValue('TXHASH');

    const moduleRef = await Test.createTestingModule({
      providers: [
        MilestonesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EscrowService, useValue: escrow },
        { provide: NotificationsService, useValue: notifications },
        { provide: ActivityLogsService, useValue: activityLogs },
      ],
    }).compile();
    service = moduleRef.get(MilestonesService);
  });

  it('approve releases escrow funds and completes the contract when it was the last milestone', async () => {
    prisma.milestone.findUnique.mockResolvedValue(milestoneFixture());
    prisma.milestone.findMany.mockResolvedValue([{ status: 'released' }]);

    await service.approve('m1', companyUser);

    expect(escrow.releaseMilestoneFunds).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ id: 'm1' }),
    );
    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );
    expect(notifications.notify).toHaveBeenCalledWith(
      'freelancer-user',
      'payment_released',
      expect.stringContaining('500'),
      expect.objectContaining({ txHash: 'TXHASH' }),
    );
  });

  it('only the contract company can approve', async () => {
    prisma.milestone.findUnique.mockResolvedValue(milestoneFixture());
    await expect(service.approve('m1', freelancerUser)).rejects.toThrow(
      ForbiddenException,
    );
    expect(escrow.releaseMilestoneFunds).not.toHaveBeenCalled();
  });

  it('cannot approve a milestone that is not under review', async () => {
    prisma.milestone.findUnique.mockResolvedValue(
      milestoneFixture({ status: 'released' }),
    );
    await expect(service.approve('m1', companyUser)).rejects.toThrow(
      BadRequestException,
    );
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
