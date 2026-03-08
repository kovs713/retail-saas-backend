import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SourceDto {
  @ApiProperty({ description: 'Source content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Source metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
