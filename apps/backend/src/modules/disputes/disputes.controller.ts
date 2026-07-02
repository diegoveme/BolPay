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

  /** Step 1: the opening party gets the dispute XDR to sign with its wallet. */
  @Post('prepare')
  @ApiOperation({ summary: 'Get the dispute transaction for the party to sign' })
  prepareOpen(@CurrentUser() user: AuthUser, @Body() dto: OpenDisputeDto) {
    return this.disputesService.prepareOpen(user, dto);
  }

  /** Step 2: record the dispute after the party signed it on-chain. */
  @Post()
  @ApiOperation({
    summary: 'Record a dispute after the party signed it (locks escrow funds)',
  })
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenDisputeDto) {
    return this.disputesService.open(user, dto);
  }

  /** List the disputes visible to the current user. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.disputesService.list(user);
  }

  /** Fetch a single dispute by id. */
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.disputesService.findById(id, user);
  }

  /** Attach a file or comment as evidence on an open dispute. */
  @Post(':id/evidence')
  addEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddEvidenceDto,
  ) {
    return this.disputesService.addEvidence(id, user, dto);
  }

  /** Escalate the dispute to the platform administrators. */
  @Post(':id/escalate')
  escalate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.disputesService.escalate(id, user);
  }

  /** Resolve the dispute and execute the agreed distribution on-chain. */
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
