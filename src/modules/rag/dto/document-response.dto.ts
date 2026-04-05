import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class DocumentResponseDto {
  @ApiProperty({ description: 'Document content from vector store' })
  @IsString()
  pageContent: string;

  @ApiPropertyOptional({ description: 'Document metadata (includes _id)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
