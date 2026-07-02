import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/** http/https only, rejecting javascript:, data:, protocol-relative, etc. */
const URL_OPTS = { protocols: ['http', 'https'], require_protocol: true };

/** Editable fields of a company profile (all optional). */
export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ example: 'Acme S.R.L.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Custom software development' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'Cuernavaca, Mexico' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ example: 'Software / Fintech' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @ApiPropertyOptional({ example: 'Transparency, quality and on-time delivery.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  values?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  avatarUrl?: string;
}

/** Editable fields of a freelancer profile (all optional). */
export class UpdateFreelancerProfileDto {
  @ApiPropertyOptional({ example: 'Juan Quispe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Full-stack developer - React / NestJS' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @ApiPropertyOptional({ example: 'Developer with 5 years of experience...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ type: [String], example: ['React', 'NestJS', 'UI/UX'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 'Lima, Peru' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiPropertyOptional({ example: 'https://myportfolio.com' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/username' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(200)
  linkedin?: string;

  @ApiPropertyOptional({ example: 'https://github.com/username' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(200)
  github?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  avatarUrl?: string;
}
