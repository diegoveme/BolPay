import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  UpdateCompanyProfileDto,
  UpdateFreelancerProfileDto,
} from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/company-profile')
  @Roles('company')
  updateCompanyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCompanyProfileDto,
  ) {
    return this.usersService.updateCompanyProfile(user, dto);
  }

  @Patch('me/freelancer-profile')
  @Roles('freelancer')
  updateFreelancerProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateFreelancerProfileDto,
  ) {
    return this.usersService.updateFreelancerProfile(user, dto);
  }

  @Get('freelancers')
  @Roles('company', 'administrator')
  listFreelancers(@Query('search') search?: string) {
    return this.usersService.listFreelancers(search);
  }

  @Get('employees')
  @Roles('company', 'administrator')
  listEmployees(@Query('search') search?: string) {
    return this.usersService.listEmployees(search);
  }

  @Get()
  @Roles('administrator')
  listAll() {
    return this.usersService.listAll();
  }

  @Post('invitations')
  @Roles('company', 'administrator')
  createInvitation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.usersService.createInvitation(user, dto);
  }

  @Get('invitations')
  @Roles('company', 'administrator')
  listInvitations(@CurrentUser() user: AuthUser) {
    return this.usersService.listInvitations(user);
  }

  @Delete('invitations/:id')
  @Roles('company', 'administrator')
  revokeInvitation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.revokeInvitation(user, id);
  }

  @Get(':id')
  @Roles('administrator')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }
}
