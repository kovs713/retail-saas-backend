import {
  createProduct,
  createProductDto,
  createLowStockProduct,
  createDeletedProduct,
  createMinimalProduct,
  createElectronicsProduct,
  createClothingProduct,
  createProducts,
  createVariedProducts,
  createPaginationTestProducts,
} from '@/core/database/factories/product.factory';

describe('ProductFactory', () => {
  describe('createProductDto', () => {
    it('should create a valid dto', () => {
      const dto = createProductDto();

      expect(dto.sku).toBeDefined();
      expect(dto.name).toBeDefined();
      expect(typeof dto.price).toBe('number');
      expect(typeof dto.quantity).toBe('number');
    });

    it('should apply overrides', () => {
      const dto = createProductDto({ overrides: { name: 'Custom', price: 99.99 } });

      expect(dto.name).toBe('Custom');
      expect(dto.price).toBe(99.99);
    });
  });

  describe('createProduct', () => {
    it('should create a valid product entity', () => {
      const product = createProduct();

      expect(product.id).toBeDefined();
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('createProducts', () => {
    it('should create requested number of products', () => {
      const products = createProducts(3);

      expect(products).toHaveLength(3);
    });
  });

  describe('createLowStockProduct', () => {
    it('should create product with low quantity', () => {
      const dto = createLowStockProduct(3);

      expect(dto.quantity).toBeLessThanOrEqual(10);
    });
  });

  describe('createDeletedProduct', () => {
    it('should create product with deletedAt set', () => {
      const product = createDeletedProduct();

      expect(product.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('createMinimalProduct', () => {
    it('should create product without optional fields', () => {
      const dto = createMinimalProduct();

      expect(dto.sku).toBeDefined();
      expect(dto.name).toBeDefined();
    });
  });

  describe('category-specific factories', () => {
    it('should create electronics product with correct category', () => {
      const dto = createElectronicsProduct();

      expect(dto.categoryId).toBe('Electronics');
    });

    it('should create clothing product with correct category', () => {
      const dto = createClothingProduct();

      expect(dto.categoryId).toBe('Clothing');
    });
  });

  describe('createVariedProducts', () => {
    it('should create products with cycling categories', () => {
      const products = createVariedProducts(7);

      expect(products).toHaveLength(7);
      expect(products[0].categoryId).not.toBe(products[1].categoryId);
    });
  });

  describe('createPaginationTestProducts', () => {
    it('should create 3x pageSize products', () => {
      const products = createPaginationTestProducts(5);

      expect(products).toHaveLength(15);
    });
  });
});
