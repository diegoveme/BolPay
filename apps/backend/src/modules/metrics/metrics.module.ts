import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/** Read-only dashboard metrics (admin platform view and per-role summaries). */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
