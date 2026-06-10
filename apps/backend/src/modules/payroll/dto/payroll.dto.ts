import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const AMOUNT_PATTERN = /^(?!0+(\.0+)?$)\d{1,13}(\.\d{1,7})?$/;

export class PayrollItemInputDto {
  @ApiPropertyOptional({ description: 'Platform user id (fixed employee)' })
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiPropertyOptional({
    description: 'External Stellar wallet (when not a platform user)',
    example: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  })
  @IsOptional()
  @Matches(/^G[A-Z2-7]{55}$/, {
    message: 'recipientAddress must be a Stellar G-address',
  })
  recipientAddress?: string;

  @ApiPropertyOptional({ example: 'Juan — DevOps' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipientLabel?: string;

  @ApiProperty({ example: '1200.00' })
  @Matches(AMOUNT_PATTERN, {
    message: 'amount must be a positive decimal (max 7 decimals)',
  })
  amount!: string;
}

export class CreatePayrollDto {
  @ApiProperty({ example: 'Nómina equipo core' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: PayrollFrequency })
  @IsEnum(PayrollFrequency)
  frequency!: PayrollFrequency;

  @ApiProperty({ type: [PayrollItemInputDto], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PayrollItemInputDto)
  items!: PayrollItemInputDto[];
}

export class UpdatePayrollDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: PayrollFrequency })
  @IsOptional()
  @IsEnum(PayrollFrequency)
  frequency?: PayrollFrequency;

  @ApiPropertyOptional({
    type: [PayrollItemInputDto],
    description: 'Replaces all items',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PayrollItemInputDto)
  items?: PayrollItemInputDto[];
}

export class FundPayrollDto {
  @ApiPropertyOptional({
    description:
      'First scheduled run (defaults to the next frequency interval)',
    example: '2026-07-01T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  firstRun?: string;
}
