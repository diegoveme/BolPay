import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/** Stellar G-address to prepare a USDC trustline for. */
export class TrustlineAddressDto {
  @ApiProperty({ description: 'Stellar G-address of the wallet' })
  @Matches(/^G[A-Z2-7]{55}$/, {
    message: 'address must be a Stellar G-address',
  })
  address!: string;
}
