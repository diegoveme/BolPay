import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  /** Liveness probe: returns a static OK payload (unauthenticated). */
  @Public()
  @Get()
  check() {
    return { status: 'ok', service: 'bolpay-api' };
  }
}
