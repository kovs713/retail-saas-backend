import { ProductImage } from '../entities';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class ProductImageDto {
  @ApiProperty({ description: 'Image ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'S3 object key' })
  @Expose()
  s3Key: string;

  @ApiProperty({ description: 'Public proxy URL' })
  @Expose()
  publicUrl: string;

  @ApiProperty({ description: 'Whether this is the primary image' })
  @Expose()
  isPrimary: boolean;

  @ApiProperty({ description: 'Sort order position' })
  @Expose()
  sortOrder: number;

  @ApiPropertyOptional({ description: 'Alt text for accessibility' })
  @Expose()
  altText: string | null;

  @ApiProperty({ description: 'MIME content type' })
  @Expose()
  contentType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @Expose()
  size: number;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  })
  createdAt: string;

  static fromEntity(entity: ProductImage): ProductImageDto {
    return plainToInstance(ProductImageDto, entity, {
      excludeExtraneousValues: true,
    });
  }

  static fromEntities(entities: ProductImage[]): ProductImageDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
