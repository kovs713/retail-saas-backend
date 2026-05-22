import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { PreprocessDocumentDto } from '@/modules/doc-preprocessor/dto';

export class UploadRagDocumentDto extends PreprocessDocumentDto {
  @ApiPropertyOptional({ description: 'Display title for the document group' })
  @IsOptional()
  @IsString()
  title?: string;
}
