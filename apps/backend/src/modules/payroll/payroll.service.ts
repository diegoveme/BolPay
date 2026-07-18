import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type PayrollFrequency,
  type PayrollStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { EscrowService } from '../escrow/escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../../common/types/auth';
import { sumAmounts } from '../../common/decimal.util';
import {
  CreatePayrollDto,
  PayrollItemInputDto,
  UpdatePayrollDto,
} from './dto/payroll.dto';

const PAYROLL_INCLUDE = {
  company: { select: { id: true, name: true, userId: true } },
  escrow: true,
  // Item order must be stable: it maps 1:1 to the on-chain milestone index.
  items: {
    orderBy: { id: 'asc' as const },
    include: {
      recipientUser: { select: { id: true, email: true, name: true } },
      // Most recent distribution first, so the UI can show each recipient's
      // latest on-chain payment next to them.
      transactions: { orderBy: { createdAt: 'desc' as const } },
    },
  },
  executions: {
    orderBy: { executedAt: 'desc' as const },
    include: { transactions: true },
  },
} satisfies Prisma.PayrollInclude;

type LoadedPayroll = Prisma.PayrollGetPayload<{
  include: typeof PAYROLL_INCLUDE;
}>;

/** Plans the company can still edit (no escrow attached yet). */
const EDITABLE: PayrollStatus[] = ['draft', 'active', 'paused'];

/**
 * On-chain payroll. Lifecycle per cycle:
 *   draft -> (fund: escrow deployed+funded, nextRun set) funded
 *   funded -> (scheduler/manual run) executed -> active (awaiting next funding)
 *   active -> (fund again) funded -> ...      pause/resume at any point.
 */
@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly notifications: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // -- CRUD ----------------------------------------------------------------------

  /** Create a draft payroll for the caller's company with its recipients. */
  async create(user: AuthUser, dto: CreatePayrollDto) {
    const company = await this.requireCompanyProfile(user.id);
    const items = await this.resolveItems(dto.items);

    const payroll = await this.prisma.payroll.create({
      data: {
        companyId: company.id,
        name: dto.name,
        frequency: dto.frequency,
        items: { create: items },
      },
      include: PAYROLL_INCLUDE,
    });
    await this.activityLogs.record(user.id, 'payroll.created', {
      payrollId: payroll.id,
      recipients: items.length,
    });
    return payroll;
  }

  /** Update a payroll's name, frequency or recipients (not allowed while funded). */
  async update(id: string, user: AuthUser, dto: UpdatePayrollDto) {
    const payroll = await this.requireOwned(id, user);
    // A funded cycle locks the on-chain escrow (roles/amounts are immutable in
    // Trustless Work once funded), so the plan cannot be edited while a funded
    // escrow is attached - even if it was paused. Archive (refund) to change it.
    if (payroll.escrowId && payroll.escrow?.status === 'funded') {
      throw new BadRequestException(
        'You cannot edit a payroll with a funded cycle. Archive it (with a refund) and create a new one.',
      );
    }
    if (!EDITABLE.includes(payroll.status)) {
      throw new BadRequestException(
        `Cannot edit a payroll in status "${payroll.status}"`,
      );
    }
    const items = dto.items ? await this.resolveItems(dto.items) : undefined;
    return this.prisma.payroll.update({
      where: { id },
      data: {
        name: dto.name,
        frequency: dto.frequency,
        ...(items ? { items: { deleteMany: {}, create: items } } : {}),
      },
      include: PAYROLL_INCLUDE,
    });
  }

  /** List payrolls for the caller's company (all payrolls for administrators). */
  async list(user: AuthUser) {
    if (user.role === 'administrator') {
      return this.prisma.payroll.findMany({
        include: PAYROLL_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    }
    const company = await this.requireCompanyProfile(user.id);
    return this.prisma.payroll.findMany({
      where: { companyId: company.id },
      include: PAYROLL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Load a single payroll, enforcing company ownership (or admin access). */
  async findById(id: string, user: AuthUser) {
    const payroll = await this.loadById(id);
    if (payroll.company.userId !== user.id && user.role !== 'administrator') {
      throw new ForbiddenException('You do not own this payroll');
    }
    return payroll;
  }

  // -- Cycle lifecycle -------------------------------------------------------------

  /** Non-custodial fund - step 1: deploy the cycle escrow + return fund XDR. */
  async prepareFund(id: string, user: AuthUser) {
    const payroll = await this.requireOwned(id, user);
    if (payroll.escrow?.status === 'funded') {
      throw new BadRequestException('Payroll cycle already funded');
    }
    if (payroll.items.length === 0) {
      throw new BadRequestException('Payroll has no recipients');
    }
    const companyUser = await this.prisma.user.findUnique({
      where: { id: payroll.company.userId },
      select: { stellarAddress: true },
    });
    const companyAddress = companyUser?.stellarAddress;
    if (!companyAddress) {
      throw new BadRequestException('Connect your wallet to fund the payroll');
    }
    let escrow = payroll.escrow;
    if (!escrow) {
      escrow = await this.escrowService.deployPayrollEscrow(
        payroll.id,
        payroll.name,
        payroll.items,
      );
      await this.prisma.payroll.update({
        where: { id },
        data: { escrowId: escrow.id },
      });
    }
    const total = sumAmounts(payroll.items);
    return this.escrowService.prepareContractFund(
      escrow,
      companyAddress,
      total,
    );
  }

  /** Non-custodial fund - step 2: record the fund and schedule the run. */
  async confirmFund(
    id: string,
    user: AuthUser,
    txHash?: string,
    firstRun?: string,
  ) {
    const payroll = await this.requireOwned(id, user);
    if (payroll.status === 'funded') return payroll;
    if (!payroll.escrow) {
      throw new BadRequestException('Prepare the fund first');
    }
    const total = sumAmounts(payroll.items);
    await this.escrowService.confirmContractFund(payroll.escrow, total, txHash);
    const nextRun = firstRun
      ? new Date(firstRun)
      : this.advance(new Date(), payroll.frequency);
    const updated = await this.prisma.payroll.update({
      where: { id },
      data: { status: 'funded', nextRun },
      include: PAYROLL_INCLUDE,
    });
    await this.activityLogs.record(user.id, 'payroll.funded', {
      payrollId: id,
      escrowId: payroll.escrow.id,
      nextRun: nextRun.toISOString(),
    });
    return updated;
  }

  /** Manual run (also used by the scheduler when nextRun is due). */
  async executeNow(id: string, user: AuthUser) {
    const payroll = await this.requireOwned(id, user);
    return this.execute(payroll);
  }

  /** Pause an active or funded payroll so the scheduler skips it. */
  async pause(id: string, user: AuthUser) {
    const payroll = await this.requireOwned(id, user);
    if (payroll.status !== 'funded' && payroll.status !== 'active') {
      throw new BadRequestException(
        `Cannot pause a payroll in status "${payroll.status}"`,
      );
    }
    return this.prisma.payroll.update({
      where: { id },
      data: { status: 'paused' },
      include: PAYROLL_INCLUDE,
    });
  }

  /** Resume a paused payroll (back to funded if its cycle escrow is still loaded). */
  async resume(id: string, user: AuthUser) {
    const payroll = await this.requireOwned(id, user);
    if (payroll.status !== 'paused') {
      throw new BadRequestException('Only paused payrolls can be resumed');
    }
    // Back to funded when the cycle escrow is still loaded, otherwise active.
    const hasFundedEscrow = payroll.escrow?.status === 'funded';
    return this.prisma.payroll.update({
      where: { id },
      data: { status: hasFundedEscrow ? 'funded' : 'active' },
      include: PAYROLL_INCLUDE,
    });
  }

  /** Mark a payroll as completed and clear its schedule (not allowed while funded). */
  async archive(id: string, user: AuthUser) {
    const payroll = await this.requireOwned(id, user);
    if (payroll.status === 'funded') {
      throw new BadRequestException(
        'Cannot archive a payroll with a funded cycle',
      );
    }
    return this.prisma.payroll.update({
      where: { id },
      data: { status: 'completed', nextRun: null },
      include: PAYROLL_INCLUDE,
    });
  }

  // -- Scheduler entry point --------------------------------------------------------

  /** Execute every funded payroll whose scheduled date has arrived. */
  async runDuePayrolls(): Promise<number> {
    const due = await this.prisma.payroll.findMany({
      where: { status: 'funded', nextRun: { lte: new Date() } },
      include: PAYROLL_INCLUDE,
    });
    for (const payroll of due) {
      try {
        await this.execute(payroll);
      } catch (error) {
        this.logger.error(
          `Payroll ${payroll.id} execution failed: ${String(error)}`,
        );
      }
    }
    return due.length;
  }

  /**
   * Distribute the funded cycle to every recipient wallet, registering one
   * Stellar transaction per item.
   */
  private async execute(payroll: LoadedPayroll) {
    if (!payroll.escrow) {
      throw new BadRequestException('Payroll cycle is not funded');
    }

    // Atomic claim: flip funded -> active up front. A concurrent second run
    // (manual + scheduler, or two overlapping ticks) then sees status !==
    // 'funded', claims 0 rows and aborts here, so the cycle is released once.
    const claimed = await this.prisma.payroll.updateMany({
      where: { id: payroll.id, status: 'funded' },
      data: { status: 'active' },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Payroll cycle is not funded');
    }

    const execution = await this.prisma.payrollExecution.create({
      data: { payrollId: payroll.id, status: 'pending' },
    });

    let succeeded = 0;
    let total = new Prisma.Decimal(0);
    for (const [position, item] of payroll.items.entries()) {
      try {
        await this.escrowService.releasePayrollItem(
          payroll.escrow,
          item,
          position,
          execution.id,
        );
        succeeded += 1;
        total = total.add(item.amount);
        if (item.recipientUserId) {
          await this.notifications.notify(
            item.recipientUserId,
            'payroll_payment_received',
            `Payroll payment received: ${item.amount.toString()} USDC (${payroll.name})`,
            { payrollId: payroll.id, executionId: execution.id },
          );
        }
      } catch (error) {
        this.logger.error(
          `Payroll item ${item.id} distribution failed: ${String(error)}`,
        );
      }
    }

    const status =
      succeeded === payroll.items.length
        ? 'succeeded'
        : succeeded === 0
          ? 'failed'
          : 'partial';

    const [, updated] = await this.prisma.$transaction([
      this.prisma.payrollExecution.update({
        where: { id: execution.id },
        data: { status, totalAmount: total },
      }),
      this.prisma.payroll.update({
        where: { id: payroll.id },
        data:
          status === 'failed'
            ? // Fully failed: undo the up-front claim (back to 'funded'), keep
              // the escrow and DO NOT advance nextRun so the scheduler retries
              // the same due cycle.
              { status: 'funded' }
            : // Succeeded/partial: already 'active' from the claim. The next
              // cycle requires funding again, so drop the escrow and advance the
              // schedule. Known limitation: on a 'partial' run the failed
              // items' funds stay locked in the now-detached escrow and are not
              // retried automatically; they need manual reconciliation.
              {
                status: 'active',
                escrowId: null,
                nextRun: this.advance(
                  payroll.nextRun ?? new Date(),
                  payroll.frequency,
                ),
              },
        include: PAYROLL_INCLUDE,
      }),
    ]);

    await this.notifications.notify(
      payroll.company.userId,
      'payroll_executed',
      `Payroll "${payroll.name}" executed (${succeeded}/${payroll.items.length} payments, ${total.toString()} USDC)`,
      { payrollId: payroll.id, executionId: execution.id, status },
    );
    await this.activityLogs.record(payroll.company.userId, 'payroll.executed', {
      payrollId: payroll.id,
      executionId: execution.id,
      status,
      totalAmount: total.toString(),
    });
    return updated;
  }

  // -- Helpers -----------------------------------------------------------------------

  /** Compute the next run date after a given date for the payroll frequency. */
  private advance(from: Date, frequency: PayrollFrequency): Date {
    const next = new Date(from);
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }
    return next;
  }

  /** Resolve recipients: platform users must have a linked Stellar wallet. */
  private async resolveItems(items: PayrollItemInputDto[]) {
    return Promise.all(
      items.map(async (item) => {
        if (item.recipientUserId) {
          const recipient = await this.prisma.user.findUnique({
            where: { id: item.recipientUserId },
            select: { id: true, email: true, name: true, stellarAddress: true },
          });
          if (!recipient) {
            throw new NotFoundException(
              `Recipient user ${item.recipientUserId} not found`,
            );
          }
          if (!recipient.stellarAddress) {
            throw new BadRequestException(
              `${recipient.email} has no linked Stellar wallet`,
            );
          }
          return {
            recipientUserId: recipient.id,
            recipientAddress: recipient.stellarAddress,
            recipientLabel:
              item.recipientLabel ?? recipient.name ?? recipient.email,
            amount: new Prisma.Decimal(item.amount),
          };
        }
        if (!item.recipientAddress) {
          throw new BadRequestException(
            'Each item needs a recipientUserId or a recipientAddress',
          );
        }
        return {
          recipientAddress: item.recipientAddress,
          recipientLabel: item.recipientLabel,
          amount: new Prisma.Decimal(item.amount),
        };
      }),
    );
  }

  /** Load the caller's company profile, or fail if they have none. */
  private async requireCompanyProfile(userId: string) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new ForbiddenException('Company profile required');
    return profile;
  }

  /** Load a payroll by id with its relations, or 404. */
  private async loadById(id: string): Promise<LoadedPayroll> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: PAYROLL_INCLUDE,
    });
    if (!payroll) throw new NotFoundException('Payroll not found');
    return payroll;
  }

  /** Load a payroll, allowing only its owning company (or an administrator). */
  private async requireOwned(
    id: string,
    user: AuthUser,
  ): Promise<LoadedPayroll> {
    const payroll = await this.loadById(id);
    if (payroll.company.userId !== user.id && user.role !== 'administrator') {
      throw new ForbiddenException('You do not own this payroll');
    }
    return payroll;
  }
}
