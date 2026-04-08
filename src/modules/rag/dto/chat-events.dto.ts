import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class ChatChunkEventDto {
  @ApiProperty({ description: 'Chat session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Response chunk content' })
  @IsString()
  chunk: string;
}

export class ChatSourceDto {
  @ApiProperty({ description: 'Source document content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Source document metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ChatCompleteEventDto {
  @ApiProperty({ description: 'Chat session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Full AI answer' })
  @IsString()
  answer: string;

  @ApiProperty({ description: 'Source documents', type: [ChatSourceDto] })
  @IsArray()
  sources: ChatSourceDto[];

  @ApiProperty({ description: 'Response timestamp' })
  @IsString()
  timestamp: string;
}

export class ChatErrorEventDto {
  @ApiProperty({ description: 'Error message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Error code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Retry after seconds (for rate limits)' })
  @IsOptional()
  @IsNumber()
  retryAfter?: number;
}
