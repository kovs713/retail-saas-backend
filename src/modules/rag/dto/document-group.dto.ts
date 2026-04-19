import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentChunkDto {
  @ApiProperty({ description: 'Chunk content' })
  @IsString()
  pageContent: string;

  @ApiPropertyOptional({ description: 'Chunk index in the document' })
  @IsOptional()
  @IsNumber()
  chunkIndex?: number;

  @ApiPropertyOptional({ description: 'Total chunks in the document' })
  @IsOptional()
  @IsNumber()
  totalChunks?: number;
}

export class DocumentGroupDto {
  @ApiProperty({ description: 'Document group UUID' })
  @IsUUID()
  documentGroupId: string;

  @ApiProperty({ description: 'Source filename or identifier' })
  @IsString()
  source: string;

  @ApiPropertyOptional({ description: 'Document group metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Number of chunks in this document' })
  @IsNumber()
  totalChunks: number;

  @ApiProperty({ description: 'Document chunks' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentChunkDto)
  chunks: DocumentChunkDto[];
}
