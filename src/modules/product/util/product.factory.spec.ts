import { createDeletedProduct, createProduct, createProducts } from '@/core/database/factories';

describe('ProductFactory', () => {
  describe('createProduct', () => {
    it('should create a valid product entity', () => {
      const product = createProduct();

      expect(product.id).toBeDefined();
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });

    it('should apply field overrides', () => {
      const product = createProduct({ index: 2, name: 'Custom Name', quantity: 5 });

      expect(product.id).toBe('prod_002');
      expect(product.name).toBe('Custom Name');
      expect(product.quantity).toBe(5);
    });
  });

  describe('createProducts', () => {
    it('should create requested number of products', () => {
      const products = createProducts(3);

      expect(products).toHaveLength(3);
      expect(products[0].id).toBe('prod_001');
      expect(products[1].id).toBe('prod_002');
      expect(products[2].id).toBe('prod_003');
    });
  });

  describe('createDeletedProduct', () => {
    it('should create product with deletedAt set', () => {
      const product = createDeletedProduct();

      expect(product.deletedAt).toBeInstanceOf(Date);
    });

    it('should always set deletedAt', () => {
      const product = createDeletedProduct();

      expect(product.deletedAt).toBeInstanceOf(Date);
    });
  });
});
