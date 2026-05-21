import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRagDocumentChunkDto {
  @ApiProperty({ description: 'Chunk content' })
  @IsString()
  pageContent: string;
}

export class CreateRagDocumentDto {
  @ApiProperty({ description: 'Document source identifier' })
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Document chunks',
    type: [CreateRagDocumentChunkDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRagDocumentChunkDto)
  chunks: CreateRagDocumentChunkDto[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
