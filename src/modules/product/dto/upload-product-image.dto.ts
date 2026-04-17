import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ProductImagePresignedUploadDto {
  @ApiProperty({
    description: 'Image file name (e.g. photo.jpg)',
    example: 'photo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  fileName: string;
}

export class ProductImagePresignedUploadResponseDto {
  @ApiProperty({ description: 'Presigned PUT URL for upload' })
  uploadUrl: string;

  @ApiProperty({ description: 'Public proxy URL for reading uploaded image' })
  publicUrl: string;

  @ApiProperty({ description: 'Object key in private bucket' })
  key: string;
}

export class ProductImageUploadResponseDto {
  @ApiProperty({ description: 'Object key in private bucket' })
  key: string;

  @ApiProperty({ description: 'Public proxy URL for reading uploaded image' })
  publicUrl: string;

  @ApiProperty({ description: 'Stored content type' })
  contentType: string;

  @ApiProperty({ description: 'Stored object size in bytes' })
  size: number;

  @ApiProperty({ description: 'Object ETag returned by storage' })
  etag: string;
}
