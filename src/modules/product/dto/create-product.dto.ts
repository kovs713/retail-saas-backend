import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsArray,
  Min,
  MaxLength,
  IsPositive,
  IsNotEmpty,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Unique product SKU', example: 'PROD-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ description: 'Product name', example: 'Wireless Mouse' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Ergonomic wireless mouse',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Product price', example: 29.99 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ description: 'Product cost', example: 15.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiProperty({ description: 'Stock quantity', example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Product category',
    example: 'Electronics',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'Barcode (EAN/UPC)',
    example: '5901234123457',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiPropertyOptional({
    description: 'Product images URLs',
    example: ['https://example.com/image1.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { brand: 'TechBrand', color: 'Black' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
