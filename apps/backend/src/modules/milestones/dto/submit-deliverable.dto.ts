import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/** Freelancer submission: a file, a link and/or a note (at least one). */
export class SubmitDeliverableDto {
  @ApiPropertyOptional({
    example: 'https://storage.example.com/deliverable-v1.zip',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/org/repo/pull/42' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  linkUrl?: string;

  @ApiPropertyOptional({ example: 'First version of the payments module' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/** Company review note when requesting changes on a deliverable. */
export class ReviewDeliverableDto {
  @ApiPropertyOptional({
    example: 'The form is missing error handling',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
