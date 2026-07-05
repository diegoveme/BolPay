/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest asymmetric matchers are typed as any */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PollarService } from './pollar.service';
import { WalletAuthService } from './wallet-auth.service';
import { EmailVerificationService } from './email-verification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { LoginDto } from './dto/login.dto';

const STELLAR_ADDRESS = 'G' + 'A'.repeat(55);

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    invitation: { findUnique: jest.fn(), update: jest.fn() },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt') };
  const pollar = {
    verifyWallet: jest.fn().mockResolvedValue(true),
    isConfigured: false,
  };
  const walletAuth = {
    verify: jest.fn().mockReturnValue(true),
    issueChallenge: jest.fn(),
  };
  const emailVerification = {
    issue: jest.fn(),
    verify: jest.fn(),
    resend: jest.fn(),
  };
  const activityLogs = { record: jest.fn() };

  const baseDto: LoginDto = {
    email: 'maria@company.com',
    provider: 'google',
    stellarAddress: STELLAR_ADDRESS,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    pollar.verifyWallet.mockResolvedValue(true);
    pollar.isConfigured = false;
    walletAuth.verify.mockReturnValue(true);
    jwt.signAsync.mockResolvedValue('signed.jwt');
    prisma.user.findFirst.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: PollarService, useValue: pollar },
        { provide: WalletAuthService, useValue: walletAuth },
        { provide: EmailVerificationService, useValue: emailVerification },
        { provide: ActivityLogsService, useValue: activityLogs },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('rejects first login without a role', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login(baseDto)).rejects.toThrow(BadRequestException);
  });

  it('never self-registers administrators', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ ...baseDto, role: 'administrator' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('registers a company with its profile shell on first login', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      email: baseDto.email,
      role: 'company',
    });

    const result = await service.login({
      ...baseDto,
      role: 'company',
      name: 'Acme',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'company',
          stellarAddress: STELLAR_ADDRESS,
          companyProfile: { create: { name: 'Acme' } },
        }),
      }),
    );
    expect(result.accessToken).toBe('signed.jwt');
    expect(activityLogs.record).toHaveBeenCalledWith(
      'u1',
      'user.registered',
      expect.anything(),
    );
  });

  it('uses the invitation role and consumes the token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.invitation.findUnique.mockResolvedValue({
      id: 'inv1',
      email: baseDto.email,
      role: 'fixed_employee',
      status: 'pending',
      expiresAt: new Date(Date.now() + 1000 * 60),
    });
    prisma.user.create.mockResolvedValue({
      id: 'u2',
      email: baseDto.email,
      role: 'fixed_employee',
    });

    await service.login({
      ...baseDto,
      invitationToken: '0b8f8e74-43c8-4c5e-9d33-111111111111',
    });

    expect(prisma.invitation.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { status: 'accepted' },
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'fixed_employee' }),
      }),
    );
  });

  it('rejects the login when Pollar reports a wallet mismatch', async () => {
    pollar.verifyWallet.mockResolvedValue(false);
    await expect(
      service.login({ ...baseDto, pollarWalletId: 'wal_x' }),
    ).rejects.toThrow('Pollar wallet does not match');
  });

  it('requires pollarWalletId when server-side verification is configured', async () => {
    pollar.isConfigured = true;
    await expect(service.login(baseDto)).rejects.toThrow(
      'pollarWalletId is required',
    );
    expect(pollar.verifyWallet).not.toHaveBeenCalled();
  });

  it('blocks rebinding an existing account to a new wallet without Pollar verification', async () => {
    // Returning user is identified by their wallet (pollarWalletId), then
    // presents a different Stellar address. Rebinding must be refused without
    // server-side Pollar verification.
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: baseDto.email,
      role: 'freelancer',
      stellarAddress: 'G' + 'Z'.repeat(55), // different wallet already bound
      pollarWalletId: 'wal_old',
      wallets: [],
    });

    await expect(
      service.login({ ...baseDto, pollarWalletId: 'wal_old' }),
    ).rejects.toThrow('Wallet rebinding requires server-side Pollar verification');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not let the email fallback rebind a fully claimed account (takeover blocked)', async () => {
    // Attacker knows a victim's email and connects their OWN wallet. The wallet
    // lookup misses (first findFirst -> null), and the email fallback is
    // restricted to shell accounts (stellarAddress: null), so the claimed
    // victim is never matched: the attacker falls through to register(), where
    // the unique-email constraint rejects the duplicate.
    prisma.user.findFirst.mockResolvedValue(null); // wallet miss AND shell miss
    prisma.user.create.mockRejectedValue(
      new Error('Unique constraint failed on the fields: (`email`)'),
    );

    await expect(
      service.login({ ...baseDto, role: 'freelancer' }),
    ).rejects.toThrow();

    // The email fallback queried only for an unclaimed shell account.
    expect(prisma.user.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { email: baseDto.email, stellarAddress: null },
      }),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
