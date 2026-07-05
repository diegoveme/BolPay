import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AMOUNT_PATTERN } from '../../../common/constants';

/** A single milestone within a contract: title, amount and optional deadline. */
export class MilestoneInputDto {
  @ApiProperty({ example: 'UI/UX design' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 'Wireframes and mockups for every screen',
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

/** Payload to create a contract with its milestones and a target freelancer. */
export class CreateContractDto {
  @ApiPropertyOptional({
    description:
      'FreelancerProfile id (when picking an existing freelancer). Provide ' +
      'this OR invitedEmail.',
  })
  @IsOptional()
  @IsUUID()
  freelancerId?: string;

  @ApiPropertyOptional({
    description:
      'Email to address the contract to when the freelancer is not in your ' +
      'directory yet. They get invited and the contract binds to them once ' +
      'they sign up. Provide this OR freelancerId.',
    example: 'freelancer@email.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  invitedEmail?: string;

  @ApiProperty({ example: 'Mobile app development' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Flutter app with 4 milestones' })
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
