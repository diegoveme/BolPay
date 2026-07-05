import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import {
  ConfirmFundDto,
  CreatePayrollDto,
  UpdatePayrollDto,
} from './dto/payroll.dto';
import { PayrollService } from './payroll.service';

@ApiTags('payrolls')
@ApiBearerAuth()
@Roles('company')
@Controller('payrolls')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  /** Create a payroll for the caller's company. */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePayrollDto) {
    return this.payrollService.create(user, dto);
  }

  /** List the caller's payrolls. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.payrollService.list(user);
  }

  /** Get a single payroll by id. */
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payrollService.findById(id, user);
  }

  /** Update a payroll's details or recipients. */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePayrollDto,
  ) {
    return this.payrollService.update(id, user, dto);
  }

  /** Non-custodial fund - step 1: company gets the fund XDR to sign. */
  @Post(':id/fund/prepare')
  @ApiOperation({ summary: 'Deploy the cycle escrow and return the fund XDR' })
  prepareFund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payrollService.prepareFund(id, user);
  }

  /** Non-custodial fund - step 2: company confirms after signing. */
  @Post(':id/fund/confirm')
  confirmFund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmFundDto,
  ) {
    return this.payrollService.confirmFund(id, user, dto.txHash, dto.firstRun);
  }

  /** Run the funded cycle immediately (manual trigger). */
  @Post(':id/execute')
  @ApiOperation({
    summary: 'Run the funded cycle immediately (manual trigger)',
  })
  executeNow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payrollService.executeNow(id, user);
  }

  /** Pause an active or funded payroll. */
  @Post(':id/pause')
  pause(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.pause(id, user);
  }

  /** Resume a paused payroll. */
  @Post(':id/resume')
  resume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payrollService.resume(id, user);
  }

  /** Archive a payroll (mark completed). */
  @Post(':id/archive')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payrollService.archive(id, user);
  }
}
