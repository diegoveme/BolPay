import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/** Freelancer submission: a file, a link and/or a note (at least one). */
export class SubmitDeliverableDto {
  @ApiPropertyOptional({
    example: 'https://storage.example.com/entrega-v1.zip',
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

  @ApiPropertyOptional({ example: 'Primera versión del módulo de pagos' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ReviewDeliverableDto {
  @ApiPropertyOptional({
    example: 'Falta el manejo de errores en el formulario',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
