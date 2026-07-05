import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';

/** Request a sign-in code to be emailed to an address (manual sign-in path). */
export class RequestEmailCodeDto {
  @ApiProperty({ example: 'maria@company.com' })
  @IsEmail()
  email!: string;
}

/** Submit the six-digit sign-in code emailed to an address. */
export class VerifyEmailCodeDto {
  @ApiProperty({ example: 'maria@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Six-digit code' })
  @Matches(/^\d{6}$/, { message: 'code must be six digits' })
  code!: string;
}
