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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MAX_AVATAR_BYTES } from '../../common/constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  UpdateCompanyProfileDto,
  UpdateFreelancerProfileDto,
} from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-status.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Update the authenticated company's profile. */
  @Patch('me/company-profile')
  @Roles('company')
  updateCompanyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCompanyProfileDto,
  ) {
    return this.usersService.updateCompanyProfile(user, dto);
  }

  /** Update the authenticated freelancer's profile. */
  @Patch('me/freelancer-profile')
  @Roles('freelancer')
  updateFreelancerProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateFreelancerProfileDto,
  ) {
    return this.usersService.updateFreelancerProfile(user, dto);
  }

  /** Upload an avatar/logo image and return its public URL. */
  @Post('me/avatar')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Upload an avatar/logo image (max 2MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_BYTES } }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    return this.usersService.uploadAvatar(user, file);
  }

  /** List freelancers visible to the caller, optionally filtered by search. */
  @Get('freelancers')
  @Roles('company', 'administrator')
  listFreelancers(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
  ) {
    return this.usersService.listFreelancers(user, search);
  }

  /** List fixed employees, optionally filtered by search. */
  @Get('employees')
  @Roles('company', 'administrator')
  listEmployees(@Query('search') search?: string) {
    return this.usersService.listEmployees(search);
  }

  /** List every platform user (administrators). */
  @Get()
  @Roles('administrator')
  listAll() {
    return this.usersService.listAll();
  }

  /** Send an invitation by email. */
  @Post('invitations')
  @Roles('company', 'administrator')
  createInvitation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.usersService.createInvitation(user, dto);
  }

  /** List invitations visible to the caller. */
  @Get('invitations')
  @Roles('company', 'administrator')
  listInvitations(@CurrentUser() user: AuthUser) {
    return this.usersService.listInvitations(user);
  }

  /** Revoke a pending invitation by id. */
  @Delete('invitations/:id')
  @Roles('company', 'administrator')
  revokeInvitation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.revokeInvitation(user, id);
  }

  /** Fetch a single user by id (administrators). */
  @Get(':id')
  @Roles('administrator')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  /** Suspend or rehabilitate an account (administrators). */
  @Patch(':id/status')
  @Roles('administrator')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.setStatus(user.id, id, dto.status);
  }

  /** Permanently delete an account with no linked activity (administrators). */
  @Delete(':id')
  @Roles('administrator')
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deleteUser(user.id, id);
  }
}
