import { DocumentDto } from './document.dto';

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, ValidateNested } from 'class-validator';

export class DocumentWithScoreDto {
  @ApiProperty({ description: 'Document', type: DocumentDto })
  @ValidateNested()
  @Type(() => DocumentDto)
  document: DocumentDto;

  @ApiProperty({ description: 'Similarity score (0-1)', example: 0.95 })
  @IsNumber()
  score: number;
}
