import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { MailService } from '../mail/mail.service';
import type { AuthUser } from '../../common/types/auth';
import { INVITATION_TTL_DAYS, MAX_AVATAR_BYTES } from '../../common/constants';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  UpdateCompanyProfileDto,
  UpdateFreelancerProfileDto,
} from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  // -- Profiles ---------------------------------------------------------------

  /** Create or update the authenticated company's profile. */
  async updateCompanyProfile(user: AuthUser, dto: UpdateCompanyProfileDto) {
    if (user.role !== 'company') {
      throw new ForbiddenException('Only companies have a company profile');
    }
    return this.prisma.companyProfile.upsert({
      where: { userId: user.id },
      create: {
        ...dto,
        userId: user.id,
        name: dto.name ?? user.email,
      },
      update: dto,
    });
  }

  /** Create or update the authenticated freelancer's profile. */
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
        ...dto,
        userId: user.id,
        displayName: dto.displayName ?? user.email,
      },
      update: dto,
    });
  }

  /**
   * Upload an avatar/logo to Supabase Storage and return its public URL. The
   * write happens server-side behind our JWT; the bucket validates type/size
   * too. Returns the public URL for the client to save on the profile.
   */
  async uploadAvatar(
    user: AuthUser,
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('No file was received');
    const allowed = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format not allowed (PNG, JPG, WEBP or GIF)',
      );
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('The image exceeds the 2MB maximum');
    }
    const baseUrl = this.config.get<string>('supabase.url');
    const key = this.config.get<string>('supabase.anonKey');
    const bucket =
      this.config.get<string>('supabase.avatarBucket') ?? 'avatars';
    if (!baseUrl || !key) {
      throw new BadRequestException('File uploads are not configured');
    }
    const ext =
      (file.originalname.split('.').pop() ?? 'png')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 5) || 'png';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const res = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': file.mimetype,
        'x-upsert': 'true',
      },
      body: new Uint8Array(file.buffer),
    });
    if (!res.ok) {
      throw new BadRequestException('Could not upload the image');
    }
    return { url: `${baseUrl}/storage/v1/object/public/${bucket}/${path}` };
  }

  // -- Directory ---------------------------------------------------------------

  /**
   * Freelancer directory used by companies when drafting a contract.
   *
   * A company only sees freelancers it has a relationship with: ones it invited
   * (by email) or ones it has already contracted. Administrators see everyone.
   * `search` (name or email, case-insensitive) powers the typeahead so the list
   * scales without dumping everyone into a dropdown.
   */
  async listFreelancers(user: AuthUser, search?: string) {
    const searchFilter: Prisma.FreelancerProfileWhereInput = search
      ? {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const query = (where: Prisma.FreelancerProfileWhereInput) =>
      this.prisma.freelancerProfile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, stellarAddress: true } },
        },
        orderBy: { displayName: 'asc' },
        take: 50,
      });

    if (user.role === 'administrator') {
      return query(searchFilter);
    }

    const [company, invited] = await Promise.all([
      this.prisma.companyProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      }),
      this.prisma.invitation.findMany({
        where: { invitedById: user.id, role: 'freelancer' },
        select: { email: true },
      }),
    ]);

    const invitedEmails = invited.map((i) => i.email.toLowerCase());
    const relationship: Prisma.FreelancerProfileWhereInput[] = [];
    if (invitedEmails.length) {
      relationship.push({ user: { email: { in: invitedEmails } } });
    }
    if (company) {
      relationship.push({ contracts: { some: { companyId: company.id } } });
    }
    // No invitations sent and no contracts yet → empty directory.
    if (relationship.length === 0) return [];

    return query({ AND: [{ OR: relationship }, searchFilter] });
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

  /** Fetch a user by id with their profiles and wallets (administrators). */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { companyProfile: true, freelancerProfile: true, wallets: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Suspend or rehabilitate an account (administrators). A suspended account is
   * blocked at login by AuthService. Administrators cannot change their own
   * status, to avoid locking themselves out.
   */
  async setStatus(
    actingUserId: string,
    userId: string,
    status: 'active' | 'suspended',
  ) {
    if (actingUserId === userId) {
      throw new ForbiddenException('You cannot change your own account status');
    }
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      include: { companyProfile: true, freelancerProfile: true },
    });
    await this.activityLogs.record(actingUserId, 'user.status_changed', {
      userId,
      status,
    });
    return updated;
  }

  /**
   * Permanently delete an account (administrators). Blocked for the admin's own
   * account, and for accounts with linked activity (contracts, payroll,
   * disputes, invitations): those must be suspended instead, so financial
   * history and the audit trail stay intact. Cascades the account's wallets,
   * notifications, tokens and empty profiles.
   */
  async deleteUser(actingUserId: string, userId: string) {
    if (actingUserId === userId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!target) throw new NotFoundException('User not found');

    // A fixed employee who has received payroll is linked only through the
    // optional PayrollItem.recipientUser relation, which is SetNull rather than
    // Restrict: deleting would silently null those historical rows and sever
    // the audit trail. Block it explicitly, as we do for restricting FKs below.
    const payrollLink = await this.prisma.payrollItem.findFirst({
      where: { recipientUserId: userId },
      select: { id: true },
    });
    if (payrollLink) {
      throw new BadRequestException(
        'This account has linked activity (contracts, payroll or disputes). Suspend it instead of deleting.',
      );
    }

    try {
      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // A restricting foreign key means the account still has linked records.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'This account has linked activity (contracts, payroll or disputes). Suspend it instead of deleting.',
        );
      }
      throw error;
    }

    await this.activityLogs.record(actingUserId, 'user.deleted', {
      userId,
      email: target.email,
    });
    return { deleted: true };
  }

  // -- Invitations -------------------------------------------------------------

  /** Invite a user by email, persist the invitation and email the link. */
  async createInvitation(user: AuthUser, dto: CreateInvitationDto) {
    // Only administrators can create company or administrator accounts by
    // invitation; companies may only invite freelancers or fixed employees.
    if (
      (dto.role === 'administrator' || dto.role === 'company') &&
      user.role !== 'administrator'
    ) {
      throw new ForbiddenException(
        'Only administrators can invite companies or administrators',
      );
    }

    // Gate: the inviter must have a verified email before inviting others.
    const inviter = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { emailVerified: true },
    });
    if (!inviter.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before sending invitations',
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

    // Deliver the invitation through SMTP/Nodemailer (best-effort).
    const webUrl = this.config.get<string>('webUrl');
    await this.mail.sendInvitation(
      email,
      `${webUrl}/accept-invite?token=${invitation.token}`,
      dto.role,
    );
    return invitation;
  }

  /** List invitations: all of them for administrators, own ones otherwise. */
  listInvitations(user: AuthUser) {
    return this.prisma.invitation.findMany({
      where: user.role === 'administrator' ? {} : { invitedById: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Revoke a pending invitation (its creator or an administrator). */
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
