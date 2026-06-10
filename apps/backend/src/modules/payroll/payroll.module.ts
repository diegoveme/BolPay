import { Module } from '@nestjs/common';
import { EscrowModule } from '../escrow/escrow.module';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollScheduler } from './payroll.scheduler';

@Module({
  imports: [EscrowModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollScheduler],
  exports: [PayrollService],
})
export class PayrollModule {}
