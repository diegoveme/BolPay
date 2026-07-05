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
import { WalletAuthService } from './wallet-auth.service';
import { EmailVerificationService } from './email-verification.service';

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
    private readonly walletAuth: WalletAuthService,
    private readonly activityLogs: ActivityLogsService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  /** Challenge transaction a self-custodial wallet signs to prove ownership. */
  issueWalletChallenge(stellarAddress: string) {
    return this.walletAuth.issueChallenge(stellarAddress);
  }

  /**
   * Authenticate a wallet (self-custodial signature or Pollar-managed),
   * register the user on first login or sync their wallet, and return a signed
   * BolPay session.
   */
  async login(dto: LoginDto) {
    // Two independent ways to prove wallet ownership:
    //  - Self-custodial wallet (Stellar Wallets Kit): the client signs a
    //    server challenge, verified here by signature. Selected by the presence
    //    of walletAuthXdr.
    //  - Pollar-managed wallet: fail-closed check against the Pollar Server
    //    (secret key). The client MUST supply the Pollar wallet id; in dev (no
    //    secret key) verification is skipped - see PollarService.
    if (dto.walletAuthXdr) {
      if (!this.walletAuth.verify(dto.stellarAddress, dto.walletAuthXdr)) {
        throw new UnauthorizedException(
          'Wallet ownership challenge failed or expired',
        );
      }
    } else {
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
    }

    // Returning users are identified by their WALLET (not email): a connected
    // wallet that already has an account goes straight to a session - no email,
    // no role, no registration form.
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(dto.pollarWalletId ? [{ pollarWalletId: dto.pollarWalletId }] : []),
          { stellarAddress: dto.stellarAddress },
        ],
      },
      include: USER_INCLUDE,
    });

    const email = dto.email?.toLowerCase();
    if (!user && email) {
      // Email fallback matches ONLY unclaimed shell accounts (no wallet bound
      // yet). A fully-registered account already has a stellarAddress and is
      // never reachable by email here, so knowing a victim's email cannot
      // rebind their wallet: the caller falls through to register(), where the
      // unique email constraint rejects the duplicate. Shell accounts still
      // require the emailed invitation token in claimInvitedAccount below.
      user = await this.prisma.user.findFirst({
        where: { email, stellarAddress: null },
        include: USER_INCLUDE,
      });
    }

    // An invited account exists but has never been claimed (no wallet yet, e.g.
    // a freelancer a company addressed a contract to). Binding a wallet to it
    // requires the emailed invitation token, so nobody can take it over just by
    // typing the email.
    if (user && !user.stellarAddress) {
      await this.claimInvitedAccount(user, dto);
    }

    if (user) {
      user = await this.syncWallet(user, dto);
    } else {
      // First-time account: we need an email and a role.
      if (!email) {
        throw new BadRequestException('email is required to create your account');
      }
      user = await this.register(email, dto);
    }

    // Login fully succeeded. For the self-custodial path, burn the challenge now
    // (verify() does not consume it) so the signed XDR cannot be replayed after
    // use. Done here, not in verify(), so a first attempt that throws before
    // this point (e.g. missing email/role) leaves the challenge valid for the
    // registration re-submit.
    if (dto.walletAuthXdr) {
      this.walletAuth.consume(dto.stellarAddress);
    }

    // A suspended account is blocked here: ownership is proven but no session
    // is issued until an administrator rehabilitates it.
    if (user.status === 'suspended') {
      throw new ForbiddenException(
        'This account has been suspended. Contact an administrator.',
      );
    }

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

  /** Return the authenticated user with their profiles and linked wallets. */
  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: USER_INCLUDE,
    });
  }

  /** Register a first-time account from a wallet login: resolve the role and create the user. */
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
    // Best-effort: send the email-verification link (never blocks registration).
    await this.emailVerification.issue(user.id, user.email);
    return user;
  }

  /** Mark an email as verified from an emailed token. */
  verifyEmail(token: string) {
    return this.emailVerification.verify(token);
  }

  /** Email a sign-in code (manual self-declared-wallet path). */
  async requestEmailCode(email: string) {
    await this.emailVerification.requestLoginCode(email);
    return { sent: true };
  }

  /** Validate and consume an emailed sign-in code. Throws when it is wrong. */
  async verifyEmailCode(email: string, code: string) {
    await this.emailVerification.verifyLoginCode(email, code);
    return { verified: true };
  }

  /** Re-send the verification email unless the address is already verified. */
  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });
    if (user.emailVerified) {
      return { alreadyVerified: true };
    }
    await this.emailVerification.resend(user.id, user.email);
    return { sent: true };
  }

  /**
   * Keep the Pollar wallet link up to date on subsequent logins.
   *
   * Rebinding an EXISTING account to a different wallet is only allowed when
   * the new (walletId, address) pair was verified against Pollar - otherwise
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
   * Claim a pre-created (invited) account: the caller must present the emailed
   * invitation token matching this account's email. Proves control of the
   * invited inbox, so the email is marked verified. The wallet is bound right
   * after by syncWallet.
   */
  private async claimInvitedAccount(user: User, dto: LoginDto) {
    if (!dto.invitationToken) {
      throw new ForbiddenException(
        'This account was invited; open the invitation link in your email to claim it',
      );
    }
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
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        'Invitation was issued for a different email',
      );
    }
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
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
