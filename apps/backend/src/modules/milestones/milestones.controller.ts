import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import {
  ReviewDeliverableDto,
  SubmitDeliverableDto,
} from './dto/submit-deliverable.dto';
import { MilestonesService } from './milestones.service';

@ApiTags('milestones')
@ApiBearerAuth()
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.milestonesService.findById(id, user);
  }

  @Post(':id/deliverables')
  @Roles('freelancer')
  @ApiOperation({ summary: 'Submit a versioned deliverable (file/link/note)' })
  submitDeliverable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitDeliverableDto,
  ) {
    return this.milestonesService.submitDeliverable(id, user, dto);
  }

  @Post(':id/approve')
  @Roles('company')
  @ApiOperation({
    summary: 'Approve the milestone and release escrow funds on-chain',
  })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.milestonesService.approve(id, user);
  }

  @Post(':id/request-changes')
  @Roles('company')
  requestChanges(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewDeliverableDto,
  ) {
    return this.milestonesService.requestChanges(id, user, dto);
  }
}
