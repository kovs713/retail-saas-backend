import { CategoryDto } from './category.dto';

describe('CategoryDto', () => {
  const mockCategoryEntity = {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic items',
    parentId: null,
    shopId: 'shop-1',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  describe('fromEntity', () => {
    it('should convert entity to DTO', () => {
      const dto = CategoryDto.fromEntity(mockCategoryEntity as any);

      expect(dto.id).toBe('cat-1');
      expect(dto.name).toBe('Electronics');
      expect(dto.slug).toBe('electronics');
      expect(dto.description).toBe('Electronic items');
      expect(dto.parentId).toBeNull();
      expect(dto.shopId).toBe('shop-1');
    });

    it('should transform dates to ISO strings', () => {
      const dto = CategoryDto.fromEntity(mockCategoryEntity as any);

      expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });
  });

  describe('fromEntities', () => {
    it('should convert multiple entities to DTOs', () => {
      const entities = [mockCategoryEntity, { ...mockCategoryEntity, id: 'cat-2', name: 'Clothing' }];

      const dtos = CategoryDto.fromEntities(entities as any);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe('cat-1');
      expect(dtos[1].id).toBe('cat-2');
    });

    it('should return empty array for empty input', () => {
      const dtos = CategoryDto.fromEntities([]);

      expect(dtos).toHaveLength(0);
    });
  });
});
