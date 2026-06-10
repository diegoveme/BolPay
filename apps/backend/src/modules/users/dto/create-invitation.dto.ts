import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsIn } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'nuevo@correo.com' })
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
