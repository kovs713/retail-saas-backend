import { ProductResponseDto } from './product-response.dto';

import { plainToInstance } from 'class-transformer';

describe('ProductResponseDto', () => {
  const mockProductEntity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    sku: 'PROD-001',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse',
    price: 29.99,
    cost: 15.0,
    quantity: 100,
    category: 'Electronics',
    barcode: '5901234123457',
    images: ['https://example.com/image1.jpg'],
    metadata: { brand: 'TechBrand', color: 'Black' },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  describe('fromEntity', () => {
    it('should convert entity to DTO', () => {
      const dto = ProductResponseDto.fromEntity(mockProductEntity as any);

      expect(dto.id).toBe(mockProductEntity.id);
      expect(dto.sku).toBe(mockProductEntity.sku);
      expect(dto.name).toBe(mockProductEntity.name);
      expect(dto.description).toBe(mockProductEntity.description);
      expect(dto.price).toBe(mockProductEntity.price);
      expect(dto.cost).toBe(mockProductEntity.cost);
      expect(dto.quantity).toBe(mockProductEntity.quantity);
      expect(dto.category).toBe(mockProductEntity.category);
      expect(dto.barcode).toBe(mockProductEntity.barcode);
      expect(dto.images).toEqual(mockProductEntity.images);
      expect(dto.metadata).toEqual(mockProductEntity.metadata);
    });

    it('should transform dates to ISO strings', () => {
      const dto = ProductResponseDto.fromEntity(mockProductEntity as any);

      expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should handle null values', () => {
      const entityWithNulls = {
        ...mockProductEntity,
        description: null,
        cost: null,
        category: null,
        barcode: null,
        images: null,
        metadata: null,
      };

      const dto = ProductResponseDto.fromEntity(entityWithNulls as any);

      expect(dto.description).toBeNull();
      expect(dto.cost).toBeNull();
      expect(dto.category).toBeNull();
      expect(dto.barcode).toBeNull();
      expect(dto.images).toBeNull();
      expect(dto.metadata).toBeNull();
    });
  });

  describe('fromEntities', () => {
    it('should convert multiple entities to DTOs', () => {
      const entities = [mockProductEntity, { ...mockProductEntity, id: '2', sku: 'PROD-002' }];

      const dtos = ProductResponseDto.fromEntities(entities as any);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe(mockProductEntity.id);
      expect(dtos[1].id).toBe('2');
    });

    it('should return empty array for empty input', () => {
      const dtos = ProductResponseDto.fromEntities([]);

      expect(dtos).toHaveLength(0);
    });
  });
});
