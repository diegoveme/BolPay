import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Confirm email ownership using the token from the verification email. */
export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token from the emailed link' })
  @IsUUID()
  token!: string;
}
