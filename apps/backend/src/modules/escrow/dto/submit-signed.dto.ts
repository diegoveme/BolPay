import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

/** A transaction XDR already signed by a self-custodial wallet, to broadcast. */
export class SubmitSignedDto {
  @ApiProperty({ description: 'Signed Stellar transaction XDR' })
  @IsString()
  @MaxLength(20000)
  signedXdr!: string;
}
