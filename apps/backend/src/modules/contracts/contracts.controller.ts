import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { ReviewContractDto } from './dto/review-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles('company')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.contractsService.create(user, dto);
  }

  @Get()
  @ApiQuery({ name: 'status', enum: ContractStatus, required: false })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status', new ParseEnumPipe(ContractStatus, { optional: true }))
    status?: ContractStatus,
  ) {
    return this.contractsService.list(user, status);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.findById(id, user);
  }

  @Patch(':id')
  @Roles('company')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.update(id, user, dto);
  }

  /** Company → freelancer: submit the draft for acceptance. */
  @Post(':id/send')
  @Roles('company')
  send(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.send(id, user);
  }

  /** Freelancer accepts; escrow is deployed and funded automatically. */
  @Post(':id/accept')
  @Roles('freelancer')
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.accept(id, user);
  }

  @Post(':id/reject')
  @Roles('freelancer')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewContractDto,
  ) {
    return this.contractsService.reject(id, user, dto);
  }

  @Post(':id/request-changes')
  @Roles('freelancer')
  requestChanges(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewContractDto,
  ) {
    return this.contractsService.requestChanges(id, user, dto);
  }
}
