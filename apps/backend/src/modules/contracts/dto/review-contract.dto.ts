import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Freelancer feedback when rejecting or requesting modifications. */
export class ReviewContractDto {
  @ApiPropertyOptional({
    example: 'The amount for milestone 2 does not reflect the scope',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
