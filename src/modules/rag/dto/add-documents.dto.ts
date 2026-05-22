import { DocumentDto } from './document.dto';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AddDocumentsDto {
  @ApiProperty({ description: 'Documents to add', type: [DocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents: DocumentDto[];

  @ApiPropertyOptional({ description: 'Display title for the document group' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Source identifier' })
  @IsOptional()
  @IsString()
  source?: string;
}
