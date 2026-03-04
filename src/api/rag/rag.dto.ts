import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({ description: 'Message to send', example: 'What is NestJS?' })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Max documents to retrieve',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  maxResults?: number;

  @ApiPropertyOptional({ description: 'Custom system prompt' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

export class DocumentDto {
  @ApiProperty({ description: 'Document content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Document metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

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

export class AddTextsRequestDto {
  @ApiProperty({ description: 'Texts to add', type: [String] })
  @IsArray()
  @IsString({ each: true })
  texts: string[];

  @ApiPropertyOptional({ description: 'Metadata', type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  metadata?: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Custom IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}

export class SourceDto {
  @ApiProperty({ description: 'Source content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Source metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ChatResponseDto {
  @ApiProperty({ description: 'AI answer' })
  @IsString()
  answer: string;

  @ApiProperty({ description: 'Source documents', type: [SourceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceDto)
  sources: SourceDto[];

  @ApiProperty({ description: 'Response timestamp' })
  @IsString()
  timestamp: string;
}

export class DocumentWithScoreDto {
  @ApiProperty({ description: 'Document', type: DocumentDto })
  @ValidateNested()
  @Type(() => DocumentDto)
  document: DocumentDto;

  @ApiProperty({ description: 'Similarity score (0-1)', example: 0.95 })
  @IsNumber()
  score: number;
}

export class ChatWithScoresResponseDto {
  @ApiProperty({ description: 'AI answer' })
  @IsString()
  answer: string;

  @ApiProperty({
    description: 'Sources with scores',
    type: [DocumentWithScoreDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentWithScoreDto)
  sources: DocumentWithScoreDto[];

  @ApiProperty({ description: 'Response timestamp' })
  @IsString()
  timestamp: string;
}

export class AddDocumentsResponseDto {
  @ApiProperty({ description: 'Document IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  documentIds: string[];

  @ApiProperty({ description: 'Count' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}

export class AddTextsResponseDto {
  @ApiProperty({ description: 'Text IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  textIds: string[];

  @ApiProperty({ description: 'Count' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}

export class RagStatsResponseDto {
  @ApiProperty({ description: 'Document count' })
  @IsNumber()
  documentCount: number;

  @ApiProperty({ description: 'Collection name' })
  @IsString()
  collectionName: string;
}
