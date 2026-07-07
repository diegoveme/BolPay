import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@ApiBearerAuth()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /** Platform-wide metrics for the administrator dashboard. */
  @Get('admin')
  @Roles('administrator')
  admin() {
    return this.metrics.adminMetrics();
  }

  /** Metrics scoped to the caller's role (company, freelancer or fixed employee). */
  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.metrics.summary(user);
  }
}
