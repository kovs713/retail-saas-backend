import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  StorefrontCategoryDto,
  StorefrontProductDto,
  StorefrontShopDto,
} from './storefront-response.dto';

export class StorefrontPaginatedResponseDto {
  @ApiProperty({ description: 'Shop information' })
  @Expose()
  @Type(() => StorefrontShopDto)
  shop: StorefrontShopDto;

  @ApiProperty({
    description: 'Paginated products list',
    type: [StorefrontProductDto],
  })
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

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
    properties: {
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      total: { type: 'number', example: 100 },
      totalPages: { type: 'number', example: 10 },
    },
  })
  @Expose()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({ description: 'Response timestamp' })
  @Expose()
  timestamp: string;
}
