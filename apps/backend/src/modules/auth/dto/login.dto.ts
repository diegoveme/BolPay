import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Exchange a Pollar login (done client-side with the publishable key) for a
 * BolPay session. The client sends the identity Pollar resolved: email,
 * provider and the Stellar wallet address Pollar created/linked.
 */
export class LoginDto {
  @ApiPropertyOptional({
    example: 'maria@company.com',
    description:
      'Required only on first registration; returning users match by wallet',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.google })
  @IsEnum(AuthProvider)
  provider!: AuthProvider;

  @ApiProperty({
    description: 'Stellar G-address of the Pollar-managed wallet',
    example: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  })
  @Matches(/^G[A-Z2-7]{55}$/, {
    message: 'stellarAddress must be a Stellar G-address',
  })
  stellarAddress!: string;

  @ApiPropertyOptional({ description: 'Pollar wallet id (wal_...)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  pollarWalletId?: string;

  @ApiPropertyOptional({
    description:
      'Signed challenge transaction (XDR) for self-custodial wallet login ' +
      '(Stellar Wallets Kit). Its presence selects the wallet-signature auth ' +
      'path instead of Pollar verification.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  walletAuthXdr?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Required on first login (registration); ignored afterwards',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'Maria Perez' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Invitation token (email invitations)' })
  @IsOptional()
  @IsUUID()
  invitationToken?: string;
}
