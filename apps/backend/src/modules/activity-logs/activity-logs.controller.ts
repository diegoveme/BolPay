import { Controller, Get, Query } from '@nestjs/common';
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

  /** List the caller's own activity log entries. */
  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.activityLogs.listForUser(user.id);
  }

  /**
   * List the platform-wide activity feed (administrators only), optionally
   * filtered by user, action type and created-at date range.
   */
  @Get('all')
  @Roles('administrator')
  listAll(
    @Query('userId') userId?: string,
    @Query('event') event?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.activityLogs.listAll({ userId, event, from, to });
  }
}
