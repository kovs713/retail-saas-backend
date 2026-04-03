import { createCategories, createCategory, createNamedCategories } from '@/core/database/factories';

describe('CategoryFactory', () => {
  describe('createCategory', () => {
    it('should create a category with default values', () => {
      const category = createCategory();

      expect(category.name).toBe('Test Category');
      expect(category.slug).toBe('test-category');
      expect(category.shopId).toBe('');
    });

    it('should create a category with custom options', () => {
      const category = createCategory({
        name: 'Electronics',
        slug: 'electronics',
        shopId: 'shop-123',
      });

      expect(category.name).toBe('Electronics');
      expect(category.slug).toBe('electronics');
      expect(category.shopId).toBe('shop-123');
    });

    it('should auto-generate slug from name', () => {
      const category = createCategory({
        name: 'My Custom Category',
      });

      expect(category.slug).toBe('my-custom-category');
    });
  });

  describe('createCategories', () => {
    it('should create multiple categories for a shop', () => {
      const categories = createCategories(3, 'shop-123');

      expect(categories).toHaveLength(3);
      expect(categories[0].shopId).toBe('shop-123');
      expect(categories[1].name).toBe('Category 2');
      expect(categories[2].name).toBe('Category 3');
    });

    it('should create categories with sequential names', () => {
      const categories = createCategories(5, 'shop-456');

      expect(categories[0].name).toBe('Category 1');
      expect(categories[4].name).toBe('Category 5');
    });
  });

  describe('createNamedCategories', () => {
    it('should create categories with specified names', () => {
      const names = [
        { name: 'Electronics', slug: 'electronics' },
        { name: 'Clothing', slug: 'clothing' },
      ];
      const categories = createNamedCategories(names, 'shop-123');

      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('Electronics');
      expect(categories[0].slug).toBe('electronics');
      expect(categories[1].name).toBe('Clothing');
      expect(categories[1].slug).toBe('clothing');
    });

    it('should auto-generate slugs when not provided', () => {
      const names = [{ name: 'My Category' }];
      const categories = createNamedCategories(names, 'shop-123');

      expect(categories[0].slug).toBe('my-category');
    });
  });
});
