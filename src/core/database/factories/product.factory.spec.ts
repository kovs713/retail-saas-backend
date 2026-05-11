import {
  createDeletedProduct,
  createProduct,
  createProducts,
} from './product.factory';

describe('product.factory', () => {
  describe('createProduct', () => {
    it('should create product with default values', () => {
      const product = createProduct();

      expect(product.id).toBe('prod_001');
      expect(product.shopId).toBe('shop_001');
      expect(product.sku).toBe('TEST-001');
      expect(product.name).toBe('Test Product 1');
      expect(product.price).toBe(2999);
      expect(product.quantity).toBe(100);
    });

    it('should create product with null default values', () => {
      const product = createProduct();

      expect(product.description).toBeNull();
      expect(product.cost).toBeNull();
      expect(product.categoryId).toBeNull();
      expect(product.barcode).toBeNull();
      expect(product.metadata).toBeNull();
    });

    it('should create product with empty images array', () => {
      const product = createProduct();

      expect(product.images).toEqual([]);
    });

    it('should create product with null deletedAt by default', () => {
      const product = createProduct();

      expect(product.deletedAt).toBeNull();
    });

    it('should create product with custom index', () => {
      const product = createProduct({ index: 5 });

      expect(product.id).toBe('prod_005');
      expect(product.shopId).toBe('shop_005');
      expect(product.sku).toBe('TEST-005');
      expect(product.name).toBe('Test Product 5');
    });

    it('should allow overriding price', () => {
      const product = createProduct({ price: 5000 });

      expect(product.price).toBe(5000);
    });

    it('should allow overriding quantity', () => {
      const product = createProduct({ quantity: 50 });

      expect(product.quantity).toBe(50);
    });

    it('should allow overriding categoryId', () => {
      const product = createProduct({ categoryId: 'cat_001' });

      expect(product.categoryId).toBe('cat_001');
    });

    it('should allow overriding shopId', () => {
      const product = createProduct({ shopId: 'custom-shop' });

      expect(product.shopId).toBe('custom-shop');
    });

    it('should create product with timestamps', () => {
      const product = createProduct();

      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });

    it('should exclude index from resulting object', () => {
      const product = createProduct({ index: 1 });

      expect('index' in product).toBe(false);
    });
  });

  describe('createProducts', () => {
    it('should create specified number of products', () => {
      const products = createProducts(3);

      expect(products).toHaveLength(3);
    });

    it('should create products with sequential indices', () => {
      const products = createProducts(3);

      expect(products[0].id).toBe('prod_001');
      expect(products[1].id).toBe('prod_002');
      expect(products[2].id).toBe('prod_003');
    });

    it('should generate unique SKUs for each product', () => {
      const products = createProducts(3);

      const skus = products.map((p) => p.sku);
      expect(new Set(skus).size).toBe(3);
    });

    it('should generate unique names for each product', () => {
      const products = createProducts(3);

      const names = products.map((p) => p.name);
      expect(new Set(names).size).toBe(3);
    });

    it('should apply overrides to all products', () => {
      const products = createProducts(2, { price: 9999 });

      expect(products[0].price).toBe(9999);
      expect(products[1].price).toBe(9999);
    });

    it('should create products with distinct IDs', () => {
      const products = createProducts(3);

      const ids = products.map((p) => p.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('createDeletedProduct', () => {
    it('should create product with deletedAt set', () => {
      const product = createDeletedProduct();

      expect(product.deletedAt).toBeInstanceOf(Date);
    });

    it('should create deleted product with default values', () => {
      const product = createDeletedProduct();

      expect(product.id).toBe('prod_001');
      expect(product.sku).toBe('TEST-001');
    });

    it('should allow overrides on deleted product', () => {
      const product = createDeletedProduct({
        id: 'custom-id',
        name: 'Deleted Product',
      });

      expect(product.id).toBe('custom-id');
      expect(product.name).toBe('Deleted Product');
      expect(product.deletedAt).toBeInstanceOf(Date);
    });
  });
});
