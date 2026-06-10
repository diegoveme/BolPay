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
import type { AuthUser } from '../../common/types/auth';
import { DisputesService } from './disputes.service';
import {
  AddEvidenceDto,
  OpenDisputeDto,
  ResolveDisputeDto,
} from './dto/dispute.dto';

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({
    summary: 'Open a dispute over a milestone (locks its escrow funds)',
  })
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenDisputeDto) {
    return this.disputesService.open(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.disputesService.list(user);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.disputesService.findById(id, user);
  }

  @Post(':id/evidence')
  addEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddEvidenceDto,
  ) {
    return this.disputesService.addEvidence(id, user, dto);
  }

  @Post(':id/escalate')
  escalate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.disputesService.escalate(id, user);
  }

  @Post(':id/resolve')
  @ApiOperation({
    summary:
      'Resolve the dispute (counterpart accepts, or an administrator when escalated) and execute the distribution on-chain',
  })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolve(id, user, dto);
  }
}
