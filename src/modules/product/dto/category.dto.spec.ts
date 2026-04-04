import { createCategory } from '@/core/database/factories';
import { CategoryDto } from './category.dto';
import { Category } from '../entities';

describe('CategoryDto', () => {
  const createMockCategory = (overrides: Partial<Category> = {}): Category => {
    const base = createCategory({
      id: 'cat_001',
      name: 'Electronics',
      slug: 'electronics',
      shopId: 'shop_001',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      ...overrides,
    });
    return base as unknown as Category;
  };

  describe('fromEntity', () => {
    it('should transform Date fields to ISO strings', () => {
      const category = createMockCategory();

      const dto = CategoryDto.fromEntity(category);

      expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should pass through string date values', () => {
      const category = createMockCategory({
        createdAt: '2024-06-15T12:00:00.000Z' as any,
        updatedAt: '2024-06-16T12:00:00.000Z' as any,
      });

      const dto = CategoryDto.fromEntity(category);

      expect(dto.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-06-16T12:00:00.000Z');
    });

    it('should return undefined for non-date non-string values', () => {
      const category = createMockCategory({ createdAt: 12345 as any, updatedAt: 12345 as any });

      const dto = CategoryDto.fromEntity(category);

      expect(dto.createdAt).toBeUndefined();
      expect(dto.updatedAt).toBeUndefined();
    });
  });

  describe('fromEntities', () => {
    it('should transform multiple categories to DTOs', () => {
      const categories = [
        createMockCategory({ id: 'cat_001', name: 'Electronics' }),
        createMockCategory({ id: 'cat_002', name: 'Clothing' }),
      ];

      const dtos = CategoryDto.fromEntities(categories);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].name).toBe('Electronics');
      expect(dtos[1].name).toBe('Clothing');
    });
  });
});
