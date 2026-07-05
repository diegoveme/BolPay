import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PayrollService } from './payroll.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

function payrollFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Core payroll',
    frequency: 'biweekly',
    status: 'funded',
    nextRun: new Date('2026-06-01T12:00:00Z'),
    escrowId: 'e1',
    escrow: { id: 'e1', status: 'funded', trustlessWorkId: 'CXYZ' },
    company: { id: 'cp1', name: 'Acme', userId: 'company-user' },
    items: [
      {
        id: 'i1',
        recipientUserId: 'emp-1',
        recipientAddress: 'G' + 'A'.repeat(55),
        recipientLabel: 'Employee 1',
        amount: new Prisma.Decimal('1000'),
      },
      {
        id: 'i2',
        recipientUserId: null,
        recipientAddress: 'G' + 'C'.repeat(55),
        recipientLabel: 'External',
        amount: new Prisma.Decimal('500'),
      },
    ],
    executions: [],
    ...overrides,
  };
}

describe('PayrollService', () => {
  let service: PayrollService;
  const prisma = {
    payroll: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payrollExecution: { create: jest.fn(), update: jest.fn() },
    companyProfile: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const escrow = { releasePayrollItem: jest.fn().mockResolvedValue('TX') };
  const notifications = { notify: jest.fn() };
  const activityLogs = { record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    escrow.releasePayrollItem.mockResolvedValue('TX');
    // Atomic run claim (funded -> active) succeeds by default.
    prisma.payroll.updateMany.mockResolvedValue({ count: 1 });
    prisma.payrollExecution.create.mockResolvedValue({
      id: 'ex1',
      status: 'pending',
    });
    prisma.$transaction.mockResolvedValue([
      {},
      payrollFixture({ status: 'active' }),
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: prisma },
        { provide: EscrowService, useValue: escrow },
        { provide: NotificationsService, useValue: notifications },
        { provide: ActivityLogsService, useValue: activityLogs },
      ],
    }).compile();
    service = moduleRef.get(PayrollService);
  });

  it('runDuePayrolls distributes every item and notifies recipients + company', async () => {
    prisma.payroll.findMany.mockResolvedValue([payrollFixture()]);

    const executed = await service.runDuePayrolls();

    expect(executed).toBe(1);
    expect(escrow.releasePayrollItem).toHaveBeenCalledTimes(2);
    expect(escrow.releasePayrollItem).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ id: 'i1' }),
      0,
      'ex1',
    );
    // Platform employee gets an in-app payment notification.
    expect(notifications.notify).toHaveBeenCalledWith(
      'emp-1',
      'payroll_payment_received',
      expect.stringContaining('1000'),
      expect.anything(),
    );
    // Company receives the execution summary.
    expect(notifications.notify).toHaveBeenCalledWith(
      'company-user',
      'payroll_executed',
      expect.stringContaining('2/2'),
      expect.objectContaining({ status: 'succeeded' }),
    );
  });

  it('a partially failed cycle is recorded as partial', async () => {
    prisma.payroll.findMany.mockResolvedValue([payrollFixture()]);
    escrow.releasePayrollItem
      .mockResolvedValueOnce('TX')
      .mockRejectedValueOnce(new Error('chain unavailable'));

    await service.runDuePayrolls();

    expect(notifications.notify).toHaveBeenCalledWith(
      'company-user',
      'payroll_executed',
      expect.stringContaining('1/2'),
      expect.objectContaining({ status: 'partial' }),
    );
  });

  it('skips payrolls that are not due', async () => {
    prisma.payroll.findMany.mockResolvedValue([]);
    const executed = await service.runDuePayrolls();
    expect(executed).toBe(0);
    expect(escrow.releasePayrollItem).not.toHaveBeenCalled();
  });
});
