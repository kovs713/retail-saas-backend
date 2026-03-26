import {
  CATEGORY_TEST_PRODUCTS,
  createClothingProduct,
  createDeletedProduct,
  createElectronicsProduct,
  createHighValueProduct,
  createInvalidProduct,
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
  PRICE_RANGE_TEST_PRODUCTS,
  SAMPLE_PRODUCTS,
} from './product.factory';

describe('ProductFactory', () => {
  describe('createProductDto', () => {
    it('should create dto with defaults', () => {
      const dto = createProductDto();

      expect(dto.sku).toBe('TEST-001');
      expect(dto.name).toBe('Test Product 1');
      expect(dto.price).toBe(29.99);
      expect(dto.quantity).toBe(100);
      expect(dto.description).toBeDefined();
      expect(dto.cost).toBeDefined();
      expect(dto.categoryId).toBeDefined();
    });

    it('should use custom index', () => {
      const dto = createProductDto({ index: 5 });

      expect(dto.sku).toBe('TEST-005');
      expect(dto.name).toBe('Test Product 5');
    });

    it('should apply overrides', () => {
      const dto = createProductDto({ overrides: { name: 'Custom', price: 99.99 } });

      expect(dto.name).toBe('Custom');
      expect(dto.price).toBe(99.99);
    });

    it('should exclude optional fields when includeOptional is false', () => {
      const dto = createProductDto({ includeOptional: false });

      expect(dto.description).toBeUndefined();
      expect(dto.cost).toBeUndefined();
      expect(dto.categoryId).toBeUndefined();
      expect(dto.barcode).toBeUndefined();
      expect(dto.images).toBeUndefined();
      expect(dto.metadata).toBeUndefined();
    });

    it('should include optional field when override is provided even if includeOptional is false', () => {
      const dto = createProductDto({
        includeOptional: false,
        overrides: { description: 'forced' },
      });

      expect(dto.description).toBe('forced');
    });
  });

  describe('createProduct', () => {
    it('should create entity with generated id', () => {
      const product = createProduct();

      expect(product.id).toBe('prod_001');
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
      expect(product.deletedAt).toBeNull();
    });

    it('should use custom id', () => {
      const product = createProduct({ id: 'custom-id' });

      expect(product.id).toBe('custom-id');
    });
  });

  describe('createProducts', () => {
    it('should create array of products', () => {
      const products = createProducts(3);

      expect(products).toHaveLength(3);
      expect(products[0].id).toBe('prod_001');
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
      const dto = createUpdateProductDto({ name: 'New Name', price: 0 });

      expect(dto.name).toBe('New Name');
      expect(dto.price).toBe(0);
    });
  });

  describe('createLowStockProduct', () => {
    it('should create product with low quantity', () => {
      const dto = createLowStockProduct(3);

      expect(dto.quantity).toBe(3);
    });

    it('should use default quantity of 5', () => {
      const dto = createLowStockProduct();

      expect(dto.quantity).toBe(5);
    });
  });

  describe('createOutOfStockProduct', () => {
    it('should create product with zero quantity', () => {
      const dto = createOutOfStockProduct();

      expect(dto.quantity).toBe(0);
    });
  });

  describe('createHighValueProduct', () => {
    it('should create product with high price', () => {
      const dto = createHighValueProduct();

      expect(dto.price).toBe(199.99);
    });

    it('should use custom price', () => {
      const dto = createHighValueProduct(499.99);

      expect(dto.price).toBe(499.99);
    });
  });

  describe('createProductByCategory', () => {
    it('should set categoryId', () => {
      const dto = createProductByCategory('my-cat');

      expect(dto.categoryId).toBe('my-cat');
    });
  });

  describe('createElectronicsProduct', () => {
    it('should set electronics metadata', () => {
      const dto = createElectronicsProduct();

      expect(dto.categoryId).toBe('Electronics');
      expect(dto.metadata).toEqual(expect.objectContaining({ type: 'electronics' }));
    });
  });

  describe('createClothingProduct', () => {
    it('should set clothing metadata', () => {
      const dto = createClothingProduct();

      expect(dto.categoryId).toBe('Clothing');
      expect(dto.metadata).toEqual(expect.objectContaining({ type: 'clothing' }));
    });
  });

  describe('createInvalidProduct', () => {
    it('should merge invalid fields into dto', () => {
      const partial = createInvalidProduct({ name: '', price: -1 });

      expect(partial.name).toBe('');
      expect(partial.price).toBe(-1);
    });
  });

  describe('createMinimalProduct', () => {
    it('should exclude optional fields', () => {
      const dto = createMinimalProduct();

      expect(dto.description).toBeUndefined();
      expect(dto.cost).toBeUndefined();
    });

    it('should accept overrides', () => {
      const dto = createMinimalProduct({ sku: 'MIN-001' });

      expect(dto.sku).toBe('MIN-001');
    });
  });

  describe('createDeletedProduct', () => {
    it('should set deletedAt', () => {
      const product = createDeletedProduct();

      expect(product.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('generateRandomSku', () => {
    it('should start with default prefix', () => {
      const sku = generateRandomSku();

      expect(sku).toMatch(/^RAND-[A-Z0-9]{4}$/);
    });

    it('should use custom prefix', () => {
      const sku = generateRandomSku('CUST');

      expect(sku).toMatch(/^CUST-[A-Z0-9]{4}$/);
    });
  });

  describe('generateRandomPrice', () => {
    it('should return number within range', () => {
      for (let i = 0; i < 20; i++) {
        const price = generateRandomPrice(10, 100);
        expect(price).toBeGreaterThanOrEqual(10);
        expect(price).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('createVariedProducts', () => {
    it('should create products with cycling categories', () => {
      const products = createVariedProducts(7);

      expect(products).toHaveLength(7);
      expect(products[0].categoryId).toBe('cat-1');
      expect(products[4].categoryId).toBe('cat-5');
      expect(products[5].categoryId).toBe('cat-1');
    });
  });

  describe('createPaginationTestProducts', () => {
    it('should create 3x pageSize products', () => {
      const products = createPaginationTestProducts(5);

      expect(products).toHaveLength(15);
    });
  });

  describe('SAMPLE_PRODUCTS', () => {
    it('should contain sample data', () => {
      expect(SAMPLE_PRODUCTS).toHaveLength(3);
      expect(SAMPLE_PRODUCTS[0].sku).toBe('ELEC-001');
    });
  });

  describe('PRICE_RANGE_TEST_PRODUCTS', () => {
    it('should contain products with different prices', () => {
      expect(PRICE_RANGE_TEST_PRODUCTS).toHaveLength(5);
      const prices = PRICE_RANGE_TEST_PRODUCTS.map((p) => p.price);
      expect(prices).toEqual([9.99, 24.99, 49.99, 99.99, 199.99]);
    });
  });

  describe('CATEGORY_TEST_PRODUCTS', () => {
    it('should contain products grouped by category', () => {
      expect(CATEGORY_TEST_PRODUCTS).toHaveLength(5);
      expect(CATEGORY_TEST_PRODUCTS[0].categoryId).toBe('Electronics');
      expect(CATEGORY_TEST_PRODUCTS[2].categoryId).toBe('Clothing');
      expect(CATEGORY_TEST_PRODUCTS[4].categoryId).toBe('Home');
    });
  });
});
