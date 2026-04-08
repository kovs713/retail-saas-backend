import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ChatMessageDto {
  @ApiPropertyOptional({ description: 'Chat session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'Message to send', example: 'What products do you have?' })
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
