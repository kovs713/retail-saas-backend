import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ChattDto {
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
