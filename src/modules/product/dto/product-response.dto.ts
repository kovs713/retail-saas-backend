import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { Product } from '../entities/product.entity';

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
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

  @ApiProperty({
    description: 'Product images URLs',
    example: ['https://example.com/image1.jpg'],
    type: [String],
  })
  @Expose()
  images: string[] | null;

  @ApiProperty({
    description: 'Additional metadata',
    example: { brand: 'TechBrand', color: 'Black' },
  })
  @Expose()
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: 'Created at timestamp', example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  @Transform(({ value }) => (value as Date)?.toISOString())
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp', example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  @Transform(({ value }) => (value as Date)?.toISOString())
  updatedAt: Date;

  static fromEntity(entity: Product): ProductResponseDto {
    return plainToInstance(ProductResponseDto, entity, { excludeExtraneousValues: true });
  }

  static fromEntities(entities: Product[]): ProductResponseDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
