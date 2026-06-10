import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { AuthUser } from '../../common/types/auth';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  UpdateCompanyProfileDto,
  UpdateFreelancerProfileDto,
} from './dto/update-profile.dto';

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // -- Profiles ---------------------------------------------------------------

  async updateCompanyProfile(user: AuthUser, dto: UpdateCompanyProfileDto) {
    if (user.role !== 'company') {
      throw new ForbiddenException('Only companies have a company profile');
    }
    return this.prisma.companyProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: dto.name ?? user.email,
        description: dto.description,
      },
      update: dto,
    });
  }

  async updateFreelancerProfile(
    user: AuthUser,
    dto: UpdateFreelancerProfileDto,
  ) {
    if (user.role !== 'freelancer') {
      throw new ForbiddenException(
        'Only freelancers have a freelancer profile',
      );
    }
    return this.prisma.freelancerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: dto.displayName ?? user.email,
        headline: dto.headline,
      },
      update: dto,
    });
  }

  // -- Directory ---------------------------------------------------------------

  /** Freelancer directory used by companies when drafting a contract. */
  listFreelancers(search?: string) {
    return this.prisma.freelancerProfile.findMany({
      where: search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: {
        user: { select: { id: true, email: true, stellarAddress: true } },
      },
      orderBy: { displayName: 'asc' },
      take: 50,
    });
  }

  /** Fixed employees directory used by companies when building a payroll. */
  listEmployees(search?: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'fixed_employee',
        ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: { id: true, email: true, name: true, stellarAddress: true },
      orderBy: { email: 'asc' },
      take: 50,
    });
  }

  /** Platform-wide user list (administrators). */
  listAll() {
    return this.prisma.user.findMany({
      include: { companyProfile: true, freelancerProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { companyProfile: true, freelancerProfile: true, wallets: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // -- Invitations (docs §1: "Invitaciones por correo electrónico") -------------

  async createInvitation(user: AuthUser, dto: CreateInvitationDto) {
    if (dto.role === 'administrator' && user.role !== 'administrator') {
      throw new ForbiddenException(
        'Only administrators can invite administrators',
      );
    }
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        role: dto.role,
        token: randomUUID(),
        invitedById: user.id,
        expiresAt: new Date(
          Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });
    await this.activityLogs.record(user.id, 'invitation.sent', {
      email,
      role: dto.role,
    });
    return invitation;
  }

  listInvitations(user: AuthUser) {
    return this.prisma.invitation.findMany({
      where: user.role === 'administrator' ? {} : { invitedById: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(user: AuthUser, id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.invitedById !== user.id && user.role !== 'administrator') {
      throw new ForbiddenException('You did not create this invitation');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        `Invitation is already ${invitation.status}`,
      );
    }
    return this.prisma.invitation.update({
      where: { id },
      data: { status: 'revoked' },
    });
  }
}
