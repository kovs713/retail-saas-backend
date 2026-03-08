import { DocumentDto } from './document.dto';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AddDocumentsRequestDto {
  @ApiProperty({ description: 'Documents to add', type: [DocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents: DocumentDto[];

  @ApiPropertyOptional({ description: 'Source identifier' })
  @IsOptional()
  @IsString()
  source?: string;
}
