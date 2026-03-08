import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class DocumentDto {
  @ApiProperty({ description: 'Document content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Document metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
