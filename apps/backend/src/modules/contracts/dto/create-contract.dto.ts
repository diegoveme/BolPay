import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Positive USDC amount with up to 7 decimals (Stellar precision). */
const AMOUNT_PATTERN = /^(?!0+(\.0+)?$)\d{1,13}(\.\d{1,7})?$/;

export class MilestoneInputDto {
  @ApiProperty({ example: 'Diseño UI/UX' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 'Wireframes y mockups de todas las pantallas',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: '500.00',
    description: 'USDC amount as decimal string',
  })
  @Matches(AMOUNT_PATTERN, {
    message: 'amount must be a positive decimal (max 7 decimals)',
  })
  amount!: string;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class CreateContractDto {
  @ApiProperty({ description: 'FreelancerProfile id' })
  @IsUUID()
  freelancerId!: string;

  @ApiProperty({ example: 'Desarrollo de app móvil' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'App Flutter con 4 milestones' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({ type: [MilestoneInputDto], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MilestoneInputDto)
  milestones!: MilestoneInputDto[];
}
