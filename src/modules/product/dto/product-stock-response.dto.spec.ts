import { ProductStockResponseDto } from './product-stock-response.dto';

describe('ProductStockResponseDto', () => {
  const mockProduct = {
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
  };

  it('should create valid DTO with success message', () => {
    const dto: ProductStockResponseDto = {
      message: 'Stock updated successfully',
      data: mockProduct,
    };

    expect(dto.message).toBe('Stock updated successfully');
    expect(dto.data).toBeDefined();
    expect(dto.data.id).toBe('1');
  });

  it('should handle different success messages', () => {
    const dto: ProductStockResponseDto = {
      message: 'Stock adjusted',
      data: mockProduct,
    };

    expect(dto.message).toBe('Stock adjusted');
  });
});
