import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import { EscrowService } from './escrow.service';

@ApiTags('escrows')
@ApiBearerAuth()
@Controller('escrows')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  /** Platform-wide escrow monitor (administrators). */
  @Get()
  @Roles('administrator')
  listAll() {
    return this.escrowService.listAll();
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.escrowService.findById(id, user);
  }
}
