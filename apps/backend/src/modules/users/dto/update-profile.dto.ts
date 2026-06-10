import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ example: 'Acme S.R.L.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Desarrollo de software a medida' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateFreelancerProfileDto {
  @ApiPropertyOptional({ example: 'Juan Quispe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Full-stack developer — React / NestJS' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;
}
