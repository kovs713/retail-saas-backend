import { ProductStatsResponseDto } from './product-stats-response.dto';

describe('ProductStatsResponseDto', () => {
  it('should create valid DTO with stats', () => {
    const dto: ProductStatsResponseDto = {
      totalProducts: 100,
      lowStockCount: 5,
    };

    expect(dto.totalProducts).toBe(100);
    expect(dto.lowStockCount).toBe(5);
  });

  it('should handle zero counts', () => {
    const dto: ProductStatsResponseDto = {
      totalProducts: 0,
      lowStockCount: 0,
    };

    expect(dto.totalProducts).toBe(0);
    expect(dto.lowStockCount).toBe(0);
  });

  it('should handle low stock count equal to total', () => {
    const dto: ProductStatsResponseDto = {
      totalProducts: 10,
      lowStockCount: 10,
    };

    expect(dto.totalProducts).toBe(10);
    expect(dto.lowStockCount).toBe(10);
  });
});
