import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetPresignedUrlDto {
  @ApiProperty({ description: 'File key' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ description: 'Bucket name' })
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional({
    description: 'Expiry in seconds',
    example: 3600,
    default: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(86400)
  @Type(() => Number)
  expirySeconds?: number = 3600;
}
