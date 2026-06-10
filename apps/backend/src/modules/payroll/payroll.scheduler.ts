import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PayrollService } from './payroll.service';

/**
 * Periodic tick that executes due payrolls ("distribución automática en la
 * fecha programada", docs §6). The expression comes from PAYROLL_CRON so tests
 * and local runs can disable or accelerate it.
 */
@Injectable()
export class PayrollScheduler implements OnModuleInit {
  private readonly logger = new Logger(PayrollScheduler.name);

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

  async tick() {
    try {
      const executed = await this.payrollService.runDuePayrolls();
      if (executed > 0) this.logger.log(`Executed ${executed} due payroll(s)`);
    } catch (error) {
      this.logger.error(`Payroll tick failed: ${String(error)}`);
    }
  }
}
