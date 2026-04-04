import { createCategories, createCategory } from './category.factory';

describe('category.factory', () => {
  describe('createCategory', () => {
    it('should create category with default values', () => {
      const category = createCategory();

      expect(category.id).toBe('cat_001');
      expect(category.shopId).toBe('shop_001');
      expect(category.name).toBe('Test Category 1');
      expect(category.slug).toBe('test-category-1-001');
    });

    it('should create category with custom index', () => {
      const category = createCategory({ index: 5 });

      expect(category.id).toBe('cat_005');
      expect(category.shopId).toBe('shop_005');
      expect(category.name).toBe('Test Category 5');
      expect(category.slug).toBe('test-category-5-005');
    });

    it('should generate slug from name', () => {
      const category = createCategory({ name: 'My Category' });

      expect(category.slug).toContain('my-category');
    });

    it('should allow overriding name independently', () => {
      const category = createCategory({ name: 'Custom Category' });

      expect(category.name).toBe('Custom Category');
      expect(category.id).toBe('cat_001');
    });

    it('should allow overriding slug independently', () => {
      const category = createCategory({ slug: 'custom-slug' });

      expect(category.slug).toBe('custom-slug');
      expect(category.name).toBe('Test Category 1');
    });

    it('should allow overriding shopId', () => {
      const category = createCategory({ shopId: 'custom-shop' });

      expect(category.shopId).toBe('custom-shop');
    });

    it('should create category with timestamps', () => {
      const category = createCategory();

      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.updatedAt).toBeInstanceOf(Date);
    });

    it('should exclude index from resulting object', () => {
      const category = createCategory({ index: 1 });

      expect('index' in category).toBe(false);
    });
  });

  describe('createCategories', () => {
    it('should create specified number of categories', () => {
      const categories = createCategories(3);

      expect(categories).toHaveLength(3);
    });

    it('should create categories with sequential indices', () => {
      const categories = createCategories(3);

      expect(categories[0].id).toBe('cat_001');
      expect(categories[1].id).toBe('cat_002');
      expect(categories[2].id).toBe('cat_003');
    });

    it('should generate unique names for each category', () => {
      const categories = createCategories(3);

      const names = categories.map((c) => c.name);
      expect(new Set(names).size).toBe(3);
    });

    it('should generate unique slugs for each category', () => {
      const categories = createCategories(3);

      const slugs = categories.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(3);
    });

    it('should apply overrides to all categories', () => {
      const categories = createCategories(2, { shopId: 'shared-shop' });

      expect(categories[0].shopId).toBe('shared-shop');
      expect(categories[1].shopId).toBe('shared-shop');
    });

    it('should create categories with distinct IDs', () => {
      const categories = createCategories(3);

      const ids = categories.map((c) => c.id);
      expect(new Set(ids).size).toBe(3);
    });
  });
});
