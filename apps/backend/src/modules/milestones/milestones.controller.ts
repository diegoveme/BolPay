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
import { ConfirmTxDto } from '../contracts/dto/confirm-tx.dto';
import { MilestonesService } from './milestones.service';

@ApiTags('milestones')
@ApiBearerAuth()
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  /** Fetch a single milestone the current user is a party to. */
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.milestonesService.findById(id, user);
  }

  /** Freelancer submits a versioned deliverable (file, link and/or note). */
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

  /** Freelancer gets the change-status XDR to sign (marks delivery on-chain). */
  @Post(':id/deliver/prepare')
  @Roles('freelancer')
  @ApiOperation({
    summary: 'Get the on-chain "delivered" transaction for the freelancer to sign',
  })
  prepareDeliver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.milestonesService.prepareDeliver(id, user);
  }

  /** Step 1: company gets the approve XDR to sign with its wallet. */
  @Post(':id/approve/prepare')
  @Roles('company')
  prepareApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.milestonesService.prepareApprove(id, user);
  }

  /** Step 2: company gets the release XDR (after signing the approve). */
  @Post(':id/release/prepare')
  @Roles('company')
  prepareRelease(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.milestonesService.prepareRelease(id, user);
  }

  /** Step 3: company confirms the release after signing both. */
  /** Step 3: company confirms the on-chain release and records the payout. */
  @Post(':id/approve/confirm')
  @Roles('company')
  confirmApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmTxDto,
  ) {
    return this.milestonesService.confirmApprove(id, user, dto.txHash);
  }

  /** Company requests changes, sending the milestone back to the freelancer. */
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
