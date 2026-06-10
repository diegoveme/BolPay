import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeOutcome } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const AMOUNT_PATTERN = /^\d{1,13}(\.\d{1,7})?$/;

export class OpenDisputeDto {
  @ApiProperty({ description: 'Milestone under dispute' })
  @IsUUID()
  milestoneId!: string;

  @ApiProperty({ example: 'La entrega no cumple los criterios acordados' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}

export class AddEvidenceDto {
  @ApiPropertyOptional({ example: 'https://storage.example.com/captura.png' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  fileUrl?: string;

  @ApiPropertyOptional({
    example: 'El requerimiento X estaba en el anexo del contrato',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: DisputeOutcome })
  @IsEnum(DisputeOutcome)
  outcome!: DisputeOutcome;

  @ApiPropertyOptional({
    description: 'Required for split: USDC amount released to the freelancer',
    example: '300.00',
  })
  @IsOptional()
  @Matches(AMOUNT_PATTERN)
  freelancerAmount?: string;

  @ApiPropertyOptional({
    description: 'Required for split: USDC amount refunded to the company',
    example: '200.00',
  })
  @IsOptional()
  @Matches(AMOUNT_PATTERN)
  companyAmount?: string;

  @ApiPropertyOptional({
    example: 'Acuerdo: 60% del milestone por trabajo parcial',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}
