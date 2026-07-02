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
import { AMOUNT_PATTERN } from '../../../common/constants';

/** Payload to open a dispute on a milestone. */
export class OpenDisputeDto {
  @ApiProperty({ description: 'Milestone under dispute' })
  @IsUUID()
  milestoneId!: string;

  @ApiProperty({ example: 'The deliverable does not meet the agreed criteria' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}

/** Payload to add a file or comment as evidence on a dispute. */
export class AddEvidenceDto {
  @ApiPropertyOptional({ example: 'https://storage.example.com/screenshot.png' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  fileUrl?: string;

  @ApiPropertyOptional({
    example: 'Requirement X was listed in the contract annex',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

/** Payload to resolve a dispute and define the on-chain distribution. */
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
    example: 'Agreement: 60% of the milestone for partial work',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}
