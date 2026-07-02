import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types/auth';
import { AuthService } from './auth.service';
import { RequestEmailCodeDto, VerifyEmailCodeDto } from './dto/email-code.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { WalletChallengeDto } from './dto/wallet-challenge.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Exchange a wallet login for a BolPay session (registers on first login). */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Exchange a Pollar login (client-side) for a BolPay session. Registers the user on first login.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Issue an unsigned challenge transaction for self-custodial wallet login. */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('wallet-challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Issue a challenge transaction for self-custodial wallet login (Stellar Wallets Kit). The wallet signs it; the signature is verified at /auth/login.',
  })
  walletChallenge(@Body() dto: WalletChallengeDto) {
    return this.authService.issueWalletChallenge(dto.stellarAddress);
  }

  /** Return the current authenticated user. */
  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  /** Email a six-digit sign-in code (manual self-declared-wallet path). */
  @Public()
  @Throttle({ default: { ttl: 300000, limit: 5 } })
  @Post('email/request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Email a six-digit code to prove ownership of the address before a manual sign-in.',
  })
  requestEmailCode(@Body() dto: RequestEmailCodeDto) {
    return this.authService.requestEmailCode(dto.email);
  }

  /** Validate the emailed six-digit sign-in code. */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('email/verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate the six-digit sign-in code.' })
  verifyEmailCode(@Body() dto: VerifyEmailCodeDto) {
    return this.authService.verifyEmailCode(dto.email, dto.code);
  }

  /** Confirm email ownership from an emailed token. */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email ownership with an emailed token.' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  /** Re-send the email-verification link to the current user. */
  @Throttle({ default: { ttl: 600000, limit: 3 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-send the email-verification link.' })
  resendVerification(@CurrentUser() user: AuthUser) {
    return this.authService.resendVerification(user.id);
  }
}
