import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { JwtPayload } from '../../common/types/auth';
import { LoginDto } from './dto/login.dto';
import { PollarService } from './pollar.service';

const USER_INCLUDE = {
  companyProfile: true,
  freelancerProfile: true,
  wallets: true,
} satisfies Prisma.UserInclude;

/**
 * Session issuance. Identity and wallet custody live in Pollar (the client
 * authenticates there with the publishable key); this service registers the
 * user on first login, keeps the wallet link in sync, optionally verifies the
 * wallet against the Pollar Server (secret key), and signs the BolPay JWT.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly pollar: PollarService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    // Fail-closed wallet ownership check whenever the secret key is present
    // (production refuses to boot without it — see PollarService).
    if (this.pollar.isConfigured && !dto.pollarWalletId) {
      throw new UnauthorizedException('pollarWalletId is required');
    }
    const verified = await this.pollar.verifyWallet(
      dto.pollarWalletId,
      dto.stellarAddress,
    );
    if (!verified) {
      throw new UnauthorizedException(
        'Pollar wallet does not match the claimed address',
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: USER_INCLUDE,
    });

    user = user
      ? await this.syncWallet(user, dto)
      : await this.register(email, dto);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user,
    };
  }

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: USER_INCLUDE,
    });
  }

  private async register(email: string, dto: LoginDto) {
    const role = await this.resolveRole(email, dto);
    const name = dto.name ?? email.split('@')[0];

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        role,
        authProvider: dto.provider,
        stellarAddress: dto.stellarAddress,
        pollarWalletId: dto.pollarWalletId,
        wallets: {
          create: { stellarAddress: dto.stellarAddress, isPrimary: true },
        },
        ...(role === 'company' ? { companyProfile: { create: { name } } } : {}),
        ...(role === 'freelancer'
          ? { freelancerProfile: { create: { displayName: name } } }
          : {}),
      },
      include: USER_INCLUDE,
    });

    await this.activityLogs.record(user.id, 'user.registered', {
      role,
      provider: dto.provider,
    });
    return user;
  }

  /**
   * Keep the Pollar wallet link up to date on subsequent logins.
   *
   * Rebinding an EXISTING account to a different wallet is only allowed when
   * the new (walletId, address) pair was verified against Pollar — otherwise
   * anyone who knows a victim's email could hijack their payout address.
   */
  private async syncWallet(
    user: User & { wallets: { stellarAddress: string }[] },
    dto: LoginDto,
  ) {
    const walletChanged =
      user.stellarAddress !== dto.stellarAddress ||
      (dto.pollarWalletId && user.pollarWalletId !== dto.pollarWalletId);

    if (!walletChanged) {
      return this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: USER_INCLUDE,
      });
    }

    if (user.stellarAddress && !this.pollar.isConfigured) {
      throw new ForbiddenException(
        'Wallet rebinding requires server-side Pollar verification (contact an administrator)',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        stellarAddress: dto.stellarAddress,
        pollarWalletId: dto.pollarWalletId ?? user.pollarWalletId,
        wallets: {
          upsert: {
            where: {
              userId_stellarAddress: {
                userId: user.id,
                stellarAddress: dto.stellarAddress,
              },
            },
            create: { stellarAddress: dto.stellarAddress, isPrimary: true },
            update: { isPrimary: true },
          },
        },
      },
      include: USER_INCLUDE,
    });
    await this.activityLogs.record(user.id, 'wallet.linked', {
      stellarAddress: dto.stellarAddress,
    });
    return updated;
  }

  /**
   * Registration role: an invitation token wins; otherwise the role must come
   * in the payload. Administrators can only be created via invitation from
   * another administrator (or seeded).
   */
  private async resolveRole(email: string, dto: LoginDto) {
    if (dto.invitationToken) {
      const invitation = await this.prisma.invitation.findUnique({
        where: { token: dto.invitationToken },
      });
      if (!invitation || invitation.status !== 'pending') {
        throw new BadRequestException('Invitation is invalid or already used');
      }
      if (invitation.expiresAt < new Date()) {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'expired' },
        });
        throw new BadRequestException('Invitation has expired');
      }
      if (invitation.email.toLowerCase() !== email) {
        throw new ForbiddenException(
          'Invitation was issued for a different email',
        );
      }
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      });
      return invitation.role;
    }

    if (!dto.role) {
      throw new BadRequestException('role is required on first login');
    }
    if (dto.role === 'administrator') {
      throw new ForbiddenException(
        'Administrators can only be created by invitation',
      );
    }
    return dto.role;
  }
}
