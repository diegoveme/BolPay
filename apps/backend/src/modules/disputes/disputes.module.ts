import { Module } from '@nestjs/common';
import { EscrowModule } from '../escrow/escrow.module';
import { ContractsModule } from '../contracts/contracts.module';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';

/** Disputes: evidence, mutual propose/accept resolution and on-chain settlement. */
@Module({
  imports: [EscrowModule, ContractsModule],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
