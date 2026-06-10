import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Freelancer feedback when rejecting or requesting modifications. */
export class ReviewContractDto {
  @ApiPropertyOptional({
    example: 'El monto del milestone 2 no refleja el alcance',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
