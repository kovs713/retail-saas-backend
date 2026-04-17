import { DocumentType, TargetDocumentType } from '../doc-preprocessor.enum';

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class PreprocessDocumentDto {
  @ApiPropertyOptional({ enum: TargetDocumentType })
  @IsOptional()
  @IsEnum(TargetDocumentType)
  targetType?: TargetDocumentType;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  sourceType?: DocumentType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  removeNoise?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  normalizeWhitespace?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  lowercase?: boolean;
}
