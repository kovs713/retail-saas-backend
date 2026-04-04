import {
  createDeletedProduct,
  createHighValueProduct,
  createLowStockProduct,
  createMinimalProduct,
  createOutOfStockProduct,
  createPaginationTestProducts,
  createProduct,
  createProductByCategory,
  createProductDto,
  createProducts,
  createUpdateProductDto,
  createVariedProducts,
  generateRandomPrice,
  generateRandomSku,
} from './product.factory';

describe('Product Factory', () => {
  describe('createProductDto', () => {
    it('should create product with default values', () => {
      const product = createProductDto({ index: 1 });

      expect(product.sku).toBe('TEST-001');
      expect(product.name).toBe('Test Product 1');
      expect(product.price).toBe(29.99);
      expect(product.quantity).toBe(100);
      expect(product.description).toBe('A test product description');
      expect(product.cost).toBe(15.0);
      expect(product.categoryId).toBe('test-category-uuid');
    });

    it('should apply overrides', () => {
      const product = createProductDto({
        index: 5,
        overrides: { sku: 'CUSTOM-001', name: 'Custom Product', price: 99.99 },
      });

      expect(product.sku).toBe('CUSTOM-001');
      expect(product.name).toBe('Custom Product');
      expect(product.price).toBe(99.99);
      expect(product.quantity).toBe(100);
    });

    it('should exclude optional fields when includeOptional is false', () => {
      const product = createProductDto({ index: 1, includeOptional: false });

      expect(product.description).toBeUndefined();
      expect(product.cost).toBeUndefined();
      expect(product.categoryId).toBeUndefined();
      expect(product.barcode).toBeUndefined();
      expect(product.images).toBeUndefined();
      expect(product.metadata).toBeUndefined();
    });
  });

  describe('createProduct', () => {
    it('should create product entity with dates', () => {
      const product = createProduct({ index: 1 });

      expect(product.id).toBe('prod_001');
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
      expect(product.deletedAt).toBeNull();
    });

    it('should use custom id when provided', () => {
      const product = createProduct({ id: 'custom-id' });

      expect(product.id).toBe('custom-id');
    });
  });

  describe('createProducts', () => {
    it('should create multiple products with sequential indices', () => {
      const products = createProducts(3);

      expect(products).toHaveLength(3);
      expect(products[0].id).toBe('prod_001');
      expect(products[1].id).toBe('prod_002');
      expect(products[2].id).toBe('prod_003');
    });
  });

  describe('createUpdateProductDto', () => {
    it('should create update dto with defaults', () => {
      const dto = createUpdateProductDto();

      expect(dto.name).toBe('Updated Product Name');
      expect(dto.price).toBe(39.99);
      expect(dto.quantity).toBe(75);
    });

    it('should apply overrides', () => {
      const dto = createUpdateProductDto({ name: 'Custom Name', price: 100 });

      expect(dto.name).toBe('Custom Name');
      expect(dto.price).toBe(100);
    });
  });

  describe('createLowStockProduct', () => {
    it('should create product with low stock quantity', () => {
      const product = createLowStockProduct(3);

      expect(product.quantity).toBe(3);
    });

    it('should use default quantity of 5', () => {
      const product = createLowStockProduct();

      expect(product.quantity).toBe(5);
    });
  });

  describe('createOutOfStockProduct', () => {
    it('should create product with zero quantity', () => {
      const product = createOutOfStockProduct();

      expect(product.quantity).toBe(0);
    });
  });

  describe('createHighValueProduct', () => {
    it('should create product with high price', () => {
      const product = createHighValueProduct();

      expect(product.price).toBe(199.99);
    });

    it('should allow custom price', () => {
      const product = createHighValueProduct(500);

      expect(product.price).toBe(500);
    });
  });

  describe('createProductByCategory', () => {
    it('should create product with specified category', () => {
      const product = createProductByCategory('cat-123');

      expect(product.categoryId).toBe('cat-123');
    });
  });

  describe('createMinimalProduct', () => {
    it('should create product with only required fields', () => {
      const product = createMinimalProduct();

      expect(product.sku).toBe('TEST-001');
      expect(product.name).toBe('Test Product 1');
      expect(product.price).toBe(29.99);
      expect(product.quantity).toBe(100);
      expect(product.description).toBeUndefined();
      expect(product.cost).toBeUndefined();
    });

    it('should allow overrides on minimal product', () => {
      const product = createMinimalProduct({ price: 50, quantity: 10 });

      expect(product.price).toBe(50);
      expect(product.quantity).toBe(10);
    });
  });

  describe('createDeletedProduct', () => {
    it('should create product with deletedAt set', () => {
      const product = createDeletedProduct();

      expect(product.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('generateRandomSku', () => {
    it('should generate SKU with default prefix', () => {
      const sku = generateRandomSku();

      expect(sku).toMatch(/^RAND-[A-Z0-9]{4}$/);
    });

    it('should use custom prefix', () => {
      const sku = generateRandomSku('CUSTOM');

      expect(sku).toMatch(/^CUSTOM-[A-Z0-9]{4}$/);
    });
  });

  describe('generateRandomPrice', () => {
    it('should generate price within default range', () => {
      const price = generateRandomPrice();

      expect(price).toBeGreaterThanOrEqual(10);
      expect(price).toBeLessThanOrEqual(500);
    });

    it('should generate price within custom range', () => {
      const price = generateRandomPrice(100, 200);

      expect(price).toBeGreaterThanOrEqual(100);
      expect(price).toBeLessThanOrEqual(200);
    });
  });

  describe('createVariedProducts', () => {
    it('should create products with varied categories', () => {
      const products = createVariedProducts(6);

      expect(products).toHaveLength(6);
      expect(products[0].categoryId).toBe('cat-1');
      expect(products[4].categoryId).toBe('cat-5');
    });
  });

  describe('createPaginationTestProducts', () => {
    it('should create products for pagination testing', () => {
      const products = createPaginationTestProducts(5);

      expect(products).toHaveLength(15);
    });
  });
});
