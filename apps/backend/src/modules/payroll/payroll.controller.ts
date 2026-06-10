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
  CreatePayrollDto,
  FundPayrollDto,
  UpdatePayrollDto,
} from './dto/payroll.dto';
import { PayrollService } from './payroll.service';

@ApiTags('payrolls')
@ApiBearerAuth()
@Roles('company')
@Controller('payrolls')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePayrollDto) {
    return this.payrollService.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.payrollService.list(user);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payrollService.findById(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePayrollDto,
  ) {
    return this.payrollService.update(id, user, dto);
  }

  @Post(':id/fund')
  @ApiOperation({
    summary: 'Deploy + fund the escrow for the next cycle and schedule it',
  })
  fund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: FundPayrollDto,
  ) {
    return this.payrollService.fund(id, user, dto);
  }

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

  @Post(':id/pause')
  pause(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.pause(id, user);
  }

  @Post(':id/resume')
  resume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payrollService.resume(id, user);
  }

  @Post(':id/archive')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payrollService.archive(id, user);
  }
}
