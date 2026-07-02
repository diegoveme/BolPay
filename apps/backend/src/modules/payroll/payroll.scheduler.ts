import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PayrollService } from './payroll.service';

/**
 * Periodic tick that executes due payrolls ("automatic distribution on the
 * scheduled date"). The expression comes from PAYROLL_CRON so tests and local
 * runs can disable or accelerate it.
 */
@Injectable()
export class PayrollScheduler implements OnModuleInit {
  private readonly logger = new Logger(PayrollScheduler.name);
  /** Reentrancy guard: a tick must not start while the previous one awaits. */
  private running = false;

  constructor(
    private readonly payrollService: PayrollService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (!this.config.get<boolean>('payroll.schedulerEnabled')) {
      this.logger.log(
        'Payroll scheduler disabled (PAYROLL_SCHEDULER_ENABLED=false)',
      );
      return;
    }
    const expression = this.config.get<string>('payroll.cron')!;
    const job = new CronJob(expression, () => void this.tick());
    this.schedulerRegistry.addCronJob('payroll-tick', job);
    job.start();
    this.logger.log(`Payroll scheduler started (${expression})`);
  }

  /** Run one scheduler pass, executing every payroll whose run date is due. */
  async tick() {
    // Skip if the previous tick is still running so overlapping cron ticks do
    // not race each other (combined with the atomic claim in runDuePayrolls).
    if (this.running) {
      this.logger.warn('Payroll tick skipped: previous run still in progress');
      return;
    }
    this.running = true;
    try {
      const executed = await this.payrollService.runDuePayrolls();
      if (executed > 0) this.logger.log(`Executed ${executed} due payroll(s)`);
    } catch (error) {
      this.logger.error(`Payroll tick failed: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
