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
import { ConfirmTxDto } from './dto/confirm-tx.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  /** Create a contract for a freelancer (existing or invited by email). */
  @Post()
  @Roles('company')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.contractsService.create(user, dto);
  }

  /** List the caller's contracts, optionally filtered by status. */
  @Get()
  @ApiQuery({ name: 'status', enum: ContractStatus, required: false })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status', new ParseEnumPipe(ContractStatus, { optional: true }))
    status?: ContractStatus,
  ) {
    return this.contractsService.list(user, status);
  }

  /** Fetch a single contract the caller is a party to. */
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.findById(id, user);
  }

  /** Update an editable (draft or changes-requested) contract. */
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

  /** Company: get the unsigned XDR to fund the escrow (it signs it with Pollar). */
  @Post(':id/escrow/prepare-fund')
  @Roles('company')
  prepareFund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.prepareFund(id, user);
  }

  /** Company: confirm the fund after signing it client-side. */
  @Post(':id/escrow/confirm-fund')
  @Roles('company')
  confirmFund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmTxDto,
  ) {
    return this.contractsService.confirmFund(id, user, dto.txHash);
  }

  /** Freelancer rejects the proposed contract. */
  @Post(':id/reject')
  @Roles('freelancer')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewContractDto,
  ) {
    return this.contractsService.reject(id, user, dto);
  }

  /** Freelancer requests changes before accepting. */
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
