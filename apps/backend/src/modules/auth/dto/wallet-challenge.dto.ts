import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/**
 * Request a challenge transaction for self-custodial wallet login (Stellar
 * Wallets Kit). The wallet signs the returned XDR to prove it owns the address.
 */
export class WalletChallengeDto {
  @ApiProperty({
    description: 'Stellar G-address of the wallet to authenticate',
    example: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  })
  @Matches(/^G[A-Z2-7]{55}$/, {
    message: 'stellarAddress must be a Stellar G-address',
  })
  stellarAddress!: string;
}
