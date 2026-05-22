import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRagDocumentChunkDto {
  @ApiPropertyOptional({ description: 'Chunk content' })
  @IsOptional()
  @IsString()
  pageContent?: string;

  @ApiPropertyOptional({ description: 'Chunk index' })
  @IsOptional()
  pageOrder?: number;
}

export class UpdateRagDocumentDto {
  @ApiPropertyOptional({ description: 'Display title for the document group' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Document source identifier' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Document chunks',
    type: [UpdateRagDocumentChunkDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRagDocumentChunkDto)
  chunks?: UpdateRagDocumentChunkDto[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
