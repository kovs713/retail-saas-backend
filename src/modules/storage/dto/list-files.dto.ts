import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, IsString } from 'class-validator';

export class ListFilesDto {
  @ApiPropertyOptional({
    description: 'File prefix filter',
    example: 'documents/',
  })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of files to return',
    example: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Start listing after this file key',
    example: 'documents/file-5.pdf',
  })
  @IsOptional()
  @IsString()
  startAfter?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number;
}
