import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Result of a client-side Pollar signature for an escrow action. */
export class ConfirmTxDto {
  @ApiPropertyOptional({
    description: 'Stellar transaction hash returned by the wallet signature',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  txHash?: string;
}
