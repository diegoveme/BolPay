import { Module } from '@nestjs/common';
import { EscrowModule } from '../escrow/escrow.module';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';

/** Contracts: lifecycle from draft to completion; deploys the contract escrow. */
@Module({
  imports: [EscrowModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
