import { Module } from '@nestjs/common';
import { EscrowModule } from '../escrow/escrow.module';
import { ContractsModule } from '../contracts/contracts.module';
import { DisputesModule } from '../disputes/disputes.module';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';

/** Milestones: deliverable submission, review and escrow release. */
@Module({
  imports: [EscrowModule, ContractsModule, DisputesModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
