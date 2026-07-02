import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsIn } from 'class-validator';

/** Payload to invite a user (by email) with a target role. */
export class CreateInvitationDto {
  @ApiProperty({ example: 'new@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: [
      UserRole.freelancer,
      UserRole.fixed_employee,
      UserRole.company,
      UserRole.administrator,
    ],
  })
  @IsEnum(UserRole)
  @IsIn(Object.values(UserRole))
  role!: UserRole;
}
