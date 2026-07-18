import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CODE_MAX_ATTEMPTS = 5;

/**
 * Issues and validates email-verification tokens, and triggers the verification
 * email through SMTP/Nodemailer. Pollar does not expose a backend-verifiable email claim,
 * so BolPay owns email verification (see docs/authentication.md).
 */
@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Create a fresh token and email the verification link. Best-effort send. */
  async issue(userId: string, email: string): Promise<void> {
    // Invalidate any previous tokens for this user.
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const token = randomUUID();
    await this.prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const webUrl = this.config.get<string>('webUrl');
    await this.mail.sendEmailVerification(
      email,
      `${webUrl}/verify-email?token=${token}`,
    );
  }

  /** Mark the email as verified given a valid, unexpired token. */
  async verify(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    if (!record) {
      throw new BadRequestException('Invalid verification token');
    }
    if (record.expiresAt < new Date()) {
      await this.prisma.emailVerificationToken.delete({
        where: { id: record.id },
      });
      throw new BadRequestException('Verification token has expired');
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
        select: { id: true, email: true, emailVerified: true },
      }),
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId: record.userId },
      }),
    ]);
    return user;
  }

  /** Re-issue a verification email for an already-registered user. */
  async resend(userId: string, email: string): Promise<void> {
    await this.issue(userId, email);
  }

  // -- Email sign-in codes ----------------------------------------------------
  //
  // A short-lived numeric code proves the caller controls the inbox before a
  // manual (self-declared wallet) sign-in. The plaintext code is only emailed;
  // the database stores an HMAC keyed by the server secret, so a leaked table
  // alone cannot recover the six digits. One active code per email.

  /** Generate a fresh sign-in code and email it. Replaces any prior code. */
  async requestLoginCode(email: string): Promise<void> {
    const normalized = email.toLowerCase();
    // randomInt is uniform and unbiased; pad so every code is six digits.
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = this.hashCode(normalized, code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.emailLoginCode.upsert({
      where: { email: normalized },
      create: { email: normalized, codeHash, expiresAt },
      update: { codeHash, expiresAt, attempts: 0 },
    });
    // Best-effort send (dev logs the code): never leak whether the send failed.
    await this.mail.sendEmailCode(normalized, code);
  }

  /**
   * Validate a sign-in code and consume it. Throws on a missing, expired,
   * exhausted or wrong code. On success the code is deleted and, if an account
   * with this email already exists, its address is marked verified.
   */
  async verifyLoginCode(email: string, code: string): Promise<void> {
    const normalized = email.toLowerCase();
    const record = await this.prisma.emailLoginCode.findUnique({
      where: { email: normalized },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('The code is invalid or has expired.');
    }
    if (record.attempts >= CODE_MAX_ATTEMPTS) {
      await this.prisma.emailLoginCode.delete({ where: { id: record.id } });
      throw new BadRequestException(
        'Too many attempts. Request a new code and try again.',
      );
    }
    if (!this.codeMatches(record.codeHash, normalized, code)) {
      await this.prisma.emailLoginCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('The code is invalid or has expired.');
    }

    // Correct: burn the code (single use) and verify the email if the account
    // already exists (returning manual sign-in). New accounts are marked
    // verified by register() right after this passes.
    await this.prisma.emailLoginCode.delete({ where: { id: record.id } });
    await this.prisma.user.updateMany({
      where: { email: normalized },
      data: { emailVerified: true },
    });
  }

  /** HMAC-SHA256 of the code keyed by the server secret and bound to the email. */
  private hashCode(email: string, code: string): string {
    const secret = this.config.get<string>('jwt.secret') ?? '';
    return createHmac('sha256', secret)
      .update(`${email}:${code}`)
      .digest('hex');
  }

  /** Constant-time comparison of a candidate code against the stored hash. */
  private codeMatches(
    storedHash: string,
    email: string,
    code: string,
  ): boolean {
    const candidate = this.hashCode(email, code);
    const a = Buffer.from(storedHash);
    const b = Buffer.from(candidate);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
