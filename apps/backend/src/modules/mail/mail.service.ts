import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserRole } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Content-ID for the inline BolPay logo referenced by the email header. */
const LOGO_CID = 'bolpay-logo';

/**
 * Transactional email over SMTP (Gmail, Brevo, any SMTP provider) via Nodemailer.
 *
 * Sending is best-effort and never throws: a failed send is logged but must not
 * break the surrounding domain operation (registration, invitation). When SMTP
 * is not configured (local development), the email body / link is logged to the
 * console instead of being sent - so the verification flow is testable with no
 * provider at all.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly isDev: boolean;
  /** Small PNG logo embedded inline in every email (null if not found). */
  private readonly logo: Buffer | null;

  constructor(config: ConfigService) {
    const host = config.get<string>('mail.smtpHost') ?? '';
    const port = config.get<number>('mail.smtpPort') ?? 465;
    const user = config.get<string>('mail.smtpUser') ?? '';
    const pass = config.get<string>('mail.smtpPass') ?? '';
    // Gmail rewrites the From header to the authenticated address, so default to
    // it; MAIL_FROM lets you set a display name like "BolPay <addr@gmail.com>".
    this.from = config.get<string>('mail.from') || user || 'no-reply@bolpay.app';
    this.isDev = config.get<string>('nodeEnv') !== 'production';

    this.transporter =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
            auth: { user, pass },
          })
        : null;

    if (!this.transporter) {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) - emails will be logged, not sent.',
      );
    }

    this.logo = this.loadLogo();
  }

  /** Read the inline email logo once at startup; text-only header if missing. */
  private loadLogo(): Buffer | null {
    try {
      return readFileSync(join(process.cwd(), 'assets', 'logo.png'));
    } catch {
      this.logger.warn(
        'Email logo not found at assets/logo.png - using a text-only header.',
      );
      return null;
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /** Send (or, in dev, log) the email-verification link to an address. */
  async sendEmailVerification(to: string, link: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[dev] Verify the email for ${to} here: ${link}`);
    }
    await this.send({
      to,
      subject: 'Verify your BolPay email',
      html: this.layout(
        'Verify your email',
        `<p>Confirm this address to start using BolPay.</p>
         ${this.button('Verify email', link)}
         <p style="color:#6b7280;font-size:13px">This link expires in 24 hours.
         If you did not create a BolPay account, you can ignore this email.</p>`,
      ),
    });
  }

  /** Send (or, in dev, log) a numeric sign-in code to an address. */
  async sendEmailCode(to: string, code: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[dev] Sign-in code for ${to}: ${code}`);
    }
    await this.send({
      to,
      subject: 'Your BolPay sign-in code',
      html: this.layout(
        'Confirm your email',
        `<p>Use this code to finish signing in to BolPay:</p>
         <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0">${this.escapeHtml(code)}</p>
         <p style="color:#6b7280;font-size:13px">This code expires in 10 minutes.
         If you did not try to sign in, you can ignore this email.</p>`,
      ),
    });
  }

  /** Send (or, in dev, log) an invitation link for the given role to an address. */
  async sendInvitation(
    to: string,
    link: string,
    role: UserRole,
  ): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[dev] Invitation (${role}) for ${to}: ${link}`);
    }
    await this.send({
      to,
      subject: 'You have been invited to BolPay',
      html: this.layout(
        'You have been invited',
        `<p>You have been invited to join BolPay as <strong>${this.escapeHtml(role)}</strong>.</p>
         ${this.button('Accept invitation', link)}
         <p style="color:#6b7280;font-size:13px">This invitation expires in 7 days.</p>`,
      ),
    });
  }

  // -- internals --------------------------------------------------------------

  private async send(message: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[dev] email to ${message.to} - "${message.subject}" (SMTP not configured, not sent)`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        ...message,
        // Embed the logo inline (CID) so it renders without remote-image
        // blocking; contentDisposition 'inline' keeps it out of the attachment
        // list. Skipped entirely when the logo file is missing.
        attachments: this.logo
          ? [
              {
                filename: 'bolpay.png',
                content: this.logo,
                cid: LOGO_CID,
                contentDisposition: 'inline',
              },
            ]
          : undefined,
      });
    } catch (error) {
      this.logger.warn(
        `SMTP send to ${message.to} failed: ${(error as Error).message}`,
      );
    }
  }

  private button(label: string, href: string): string {
    const safeHref = this.escapeHtml(href);
    const safeLabel = this.escapeHtml(label);
    return `<p><a href="${safeHref}" style="display:inline-block;background:#1466b8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${safeLabel}</a></p>
            <p style="color:#6b7280;font-size:13px">Or paste this link: <br/>${safeHref}</p>`;
  }

  private layout(title: string, body: string): string {
    const logo = this.logo
      ? `<img src="cid:${LOGO_CID}" alt="BolPay" width="72" height="72" style="display:block;border:0;margin:0 0 12px" />`
      : '';
    return `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      ${logo}
      <h1 style="font-size:20px;margin:0 0 16px">BolPay</h1>
      <h2 style="font-size:16px;margin:0 0 12px">${this.escapeHtml(title)}</h2>
      ${body}
    </div>`;
  }

  /** Escape user-derived values before interpolating them into HTML. */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
