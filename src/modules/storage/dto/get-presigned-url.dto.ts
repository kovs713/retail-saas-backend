import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, IsString } from 'class-validator';

export class GetPresignedUrlDto {
  @ApiProperty({
    description: 'File key (path)',
    example: 'documents/report.pdf',
  })
  @IsString()
  key: string;

  @ApiPropertyOptional({
    description: 'Custom bucket name',
    example: 'my-bucket',
  })
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional({
    description: 'URL expiry time in seconds',
    example: 7200,
    default: 3600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  expirySeconds?: number;
}
