import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Product SKU', example: 'PROD-001' })
  sku: string;

  @ApiProperty({ description: 'Product name', example: 'Wireless Mouse' })
  name: string;

  @ApiProperty({ description: 'Product description', example: 'Ergonomic wireless mouse', required: false })
  description: string | null;

  @ApiProperty({ description: 'Product price', example: 29.99 })
  price: number;

  @ApiProperty({ description: 'Product cost', example: 15.0, required: false })
  cost: number | null;

  @ApiProperty({ description: 'Stock quantity', example: 100 })
  quantity: number;

  @ApiProperty({ description: 'Product category', example: 'Electronics', required: false })
  category: string | null;

  @ApiProperty({ description: 'Barcode (EAN/UPC)', example: '5901234123457', required: false })
  barcode: string | null;

  @ApiProperty({ description: 'Product images URLs', example: ['https://example.com/image1.jpg'], required: false })
  images: string[];

  @ApiProperty({
    description: 'Additional metadata',
    example: { brand: 'TechBrand', color: 'Black' },
    required: false,
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: 'Created at timestamp', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Updated at timestamp', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ description: 'Deleted at timestamp', example: null, required: false })
  deletedAt: string | null;
}
