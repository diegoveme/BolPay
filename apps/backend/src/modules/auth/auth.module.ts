import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PollarService } from './pollar.service';
import { WalletAuthService } from './wallet-auth.service';
import { EmailVerificationService } from './email-verification.service';

/** Authentication: wallet/Pollar login, sessions, and email verification. */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PollarService,
    WalletAuthService,
    EmailVerificationService,
  ],
  exports: [AuthService, PollarService, EmailVerificationService],
})
export class AuthModule {}
