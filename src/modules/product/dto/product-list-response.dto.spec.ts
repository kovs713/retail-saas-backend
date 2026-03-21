import { ProductListResponseDto } from './product-list-response.dto';
import { ProductResponseDto } from './product-response.dto';

describe('ProductListResponseDto', () => {
  const mockProducts: ProductResponseDto[] = [
    {
      id: '1',
      sku: 'PROD-001',
      name: 'Product 1',
      description: null,
      price: 29.99,
      cost: 15.0,
      quantity: 100,
      category: 'Electronics',
      barcode: null,
      images: null,
      metadata: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    },
  ];

  it('should create valid DTO with products', () => {
    const dto: ProductListResponseDto = {
      data: mockProducts,
      total: 100,
      page: 1,
      limit: 10,
      totalPages: 10,
    };

    expect(dto.data).toHaveLength(1);
    expect(dto.total).toBe(100);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.totalPages).toBe(10);
  });

  it('should handle empty product list', () => {
    const dto: ProductListResponseDto = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };

    expect(dto.data).toHaveLength(0);
    expect(dto.total).toBe(0);
    expect(dto.totalPages).toBe(0);
  });

  it('should handle pagination correctly', () => {
    const dto: ProductListResponseDto = {
      data: mockProducts,
      total: 55,
      page: 3,
      limit: 20,
      totalPages: 3,
    };

    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(20);
    expect(dto.total).toBe(55);
  });
});
