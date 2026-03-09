import { ApiProperty } from '@nestjs/swagger';

export class ProductStatsResponseDto {
  @ApiProperty({ description: 'Total number of products', example: 100 })
  totalProducts: number;

  @ApiProperty({ description: 'Number of products with low stock', example: 5 })
  lowStockCount: number;
}
