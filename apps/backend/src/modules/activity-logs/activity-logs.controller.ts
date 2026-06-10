import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import { ActivityLogsService } from './activity-logs.service';

@ApiTags('activity-logs')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogs: ActivityLogsService) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.activityLogs.listForUser(user.id);
  }

  @Get('all')
  @Roles('administrator')
  listAll() {
    return this.activityLogs.listAll();
  }
}
