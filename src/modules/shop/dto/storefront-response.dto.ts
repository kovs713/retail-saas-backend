import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ProductImageDto } from '@/modules/product/dto/product-image.dto';

export class StorefrontProductDto {
  @ApiProperty({ description: 'Product ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Product SKU' })
  @Expose()
  sku: string;

  @ApiProperty({ description: 'Product name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @Expose()
  description: string | null;

  @ApiProperty({ description: 'Product price' })
  @Expose()
  price: number;

  @ApiProperty({ description: 'Stock quantity' })
  @Expose()
  quantity: number;

  @ApiPropertyOptional({ description: 'Product category' })
  @Expose()
  category: string | null;

  @ApiPropertyOptional({
    description: 'Product images',
    type: [ProductImageDto],
  })
  @Expose()
  @Type(() => ProductImageDto)
  images: ProductImageDto[] | null;

  @ApiProperty({
    description: 'Product availability',
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
  })
  @Expose()
  availability: string;
}

export class StorefrontCategoryDto {
  @ApiProperty({ description: 'Category ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Category name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Category slug' })
  @Expose()
  slug: string;
}

export class StorefrontShopDto {
  @ApiProperty({ description: 'Shop ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Shop name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Shop slug' })
  @Expose()
  slug: string;

  @ApiPropertyOptional({ description: 'Shop description' })
  @Expose()
  description: string | null;

  @ApiPropertyOptional({ description: 'Shop address' })
  @Expose()
  address: string | null;

  @ApiPropertyOptional({ description: 'Shop phone' })
  @Expose()
  phone: string | null;

  @ApiPropertyOptional({ description: 'Working hours' })
  @Expose()
  workingHours: Record<string, string> | null;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @Expose()
  logoUrl: string | null;

  @ApiPropertyOptional({ description: 'Banner URL' })
  @Expose()
  bannerUrl: string | null;
}

export class StorefrontResponseDto {
  @ApiProperty({ description: 'Shop information' })
  @Expose()
  @Type(() => StorefrontShopDto)
  shop: StorefrontShopDto;

  @ApiProperty({ description: 'Products list', type: [StorefrontProductDto] })
  @Expose()
  @Type(() => StorefrontProductDto)
  products: StorefrontProductDto[];

  @ApiProperty({
    description: 'Categories list',
    type: [StorefrontCategoryDto],
  })
  @Expose()
  @Type(() => StorefrontCategoryDto)
  categories: StorefrontCategoryDto[];

  @ApiProperty({ description: 'Total products count' })
  @Expose()
  totalProducts: number;

  @ApiProperty({ description: 'Response timestamp' })
  @Expose()
  timestamp: string;
}
