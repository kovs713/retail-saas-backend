import { Product, ProductImage } from '../entities';
import { ProductImageDto } from './product-image.dto';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class ProductDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Product SKU', example: 'PROD-001' })
  @Expose()
  sku: string;

  @ApiProperty({ description: 'Product name', example: 'Wireless Mouse' })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Ergonomic wireless mouse',
  })
  @Expose()
  description: string | null;

  @ApiProperty({ description: 'Product price', example: 29.99 })
  @Expose()
  price: number;

  @ApiProperty({ description: 'Product cost', example: 15.0 })
  @Expose()
  cost: number | null;

  @ApiProperty({ description: 'Stock quantity', example: 100 })
  @Expose()
  quantity: number;

  @ApiProperty({ description: 'Product category', example: 'Electronics' })
  @Expose()
  category: string | null;

  @ApiProperty({ description: 'Product barcode', example: '5901234123457' })
  @Expose()
  barcode: string | null;

  @ApiPropertyOptional({
    description: 'Product images',
    type: [ProductImageDto],
  })
  @Expose()
  @Transform(({ value }) => {
    if (!value || !Array.isArray(value) || value.length === 0) {
      return null;
    }
    return ProductImageDto.fromEntities(value as ProductImage[]);
  })
  images: ProductImageDto[] | null;

  @ApiProperty({
    description: 'Additional metadata',
    example: { brand: 'TechBrand', color: 'Black' },
  })
  @Expose()
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
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

  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
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
  updatedAt: string;

  static fromEntity(entity: Product): ProductDto {
    return plainToInstance(ProductDto, entity, {
      excludeExtraneousValues: true,
    });
  }

  static fromEntities(entities: Product[]): ProductDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
