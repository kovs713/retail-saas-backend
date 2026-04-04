import { createProduct } from '@/core/database/factories';
import { ProductDto } from './product.dto';
import { Product } from '../entities';

describe('ProductDto', () => {
  const createMockProduct = (overrides: Partial<Product> = {}): Product => {
    const base = createProduct({
      index: 1,
      sku: 'PROD-001',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      price: 29.99,
      cost: 15.0,
      quantity: 100,
      categoryId: 'electronics-cat-uuid',
      barcode: '5901234123457',
      images: ['https://example.com/mouse.jpg'],
      metadata: { brand: 'TechBrand' },
      ...overrides,
    });
    return {
      ...base,
      shopId: 'shop_001',
      shop: null as any,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      ...overrides,
    } as unknown as Product;
  };

  describe('fromEntity', () => {
    it('should transform Date fields to ISO strings', () => {
      const product = createMockProduct();

      const dto = ProductDto.fromEntity(product);

      expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should pass through string date values', () => {
      const product = createMockProduct({
        createdAt: '2024-06-15T12:00:00.000Z' as any,
        updatedAt: '2024-06-16T12:00:00.000Z' as any,
      });

      const dto = ProductDto.fromEntity(product);

      expect(dto.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-06-16T12:00:00.000Z');
    });

    it('should return undefined for non-date non-string values', () => {
      const product = createMockProduct({ createdAt: 12345 as any, updatedAt: 12345 as any });

      const dto = ProductDto.fromEntity(product);

      expect(dto.createdAt).toBeUndefined();
      expect(dto.updatedAt).toBeUndefined();
    });

    it('should transform all product fields', () => {
      const product = createMockProduct();

      const dto = ProductDto.fromEntity(product);

      expect(dto.sku).toBe('PROD-001');
      expect(dto.name).toBe('Wireless Mouse');
      expect(dto.price).toBe(29.99);
      expect(dto.quantity).toBe(100);
    });
  });

  describe('fromEntities', () => {
    it('should transform multiple products to DTOs', () => {
      const products = [
        createMockProduct({ id: 'prod_001', name: 'Mouse' }),
        createMockProduct({ id: 'prod_002', name: 'Keyboard' }),
      ];

      const dtos = ProductDto.fromEntities(products);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].name).toBe('Mouse');
      expect(dtos[1].name).toBe('Keyboard');
    });
  });
});
