import { createMany, generateId, generateUniqueName, generateUniqueSlug } from './shared.utils';

describe('shared.utils', () => {
  describe('generateId', () => {
    it('should generate id with prefix and zero-padded index', () => {
      const result = generateId('user', 1);

      expect(result).toBe('user_001');
    });

    it('should pad index to 3 digits for single digit', () => {
      expect(generateId('shop', 5)).toBe('shop_005');
    });

    it('should pad index to 3 digits for double digits', () => {
      expect(generateId('prod', 42)).toBe('prod_042');
    });

    it('should handle index >= 100 without truncation', () => {
      expect(generateId('item', 100)).toBe('item_100');
      expect(generateId('item', 999)).toBe('item_999');
    });

    it('should handle different prefixes', () => {
      expect(generateId('cat', 1)).toBe('cat_001');
      expect(generateId('order', 1)).toBe('order_001');
    });
  });

  describe('generateUniqueName', () => {
    it('should concatenate base name with index', () => {
      const result = generateUniqueName('Test Shop', 1);

      expect(result).toBe('Test Shop 1');
    });

    it('should generate unique names for different indices', () => {
      const name1 = generateUniqueName('Category', 1);
      const name2 = generateUniqueName('Category', 2);

      expect(name1).not.toBe(name2);
      expect(name1).toBe('Category 1');
      expect(name2).toBe('Category 2');
    });
  });

  describe('generateUniqueSlug', () => {
    it('should convert base to lowercase kebab-case with padded index', () => {
      const result = generateUniqueSlug('Test Category', 1);

      expect(result).toBe('test-category-001');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateUniqueSlug('My Shop Name', 1)).toBe('my-shop-name-001');
    });

    it('should pad index to 3 digits', () => {
      expect(generateUniqueSlug('Item', 5)).toBe('item-005');
      expect(generateUniqueSlug('Item', 42)).toBe('item-042');
    });

    it('should handle multiple consecutive spaces', () => {
      expect(generateUniqueSlug('Test  Category', 1)).toBe('test-category-001');
    });
  });

  describe('createMany', () => {
    it('should create array of specified length', () => {
      const result = createMany(5, (i) => i);

      expect(result).toHaveLength(5);
    });

    it('should pass 1-based index to factory function', () => {
      const indices: number[] = [];
      createMany(3, (i) => {
        indices.push(i);
        return i;
      });

      expect(indices).toEqual([1, 2, 3]);
    });

    it('should return distinct items from factory', () => {
      const result = createMany(3, (i) => ({ id: i }));

      expect(result[0]).toEqual({ id: 1 });
      expect(result[1]).toEqual({ id: 2 });
      expect(result[2]).toEqual({ id: 3 });
    });

    it('should return empty array for count 0', () => {
      const result = createMany(0, (i) => i);

      expect(result).toEqual([]);
    });
  });
});
