import { createShop, createShops } from './shop.factory';

describe('shop.factory', () => {
  describe('createShop', () => {
    it('should create shop with default values', () => {
      const shop = createShop();

      expect(shop.id).toBe('shop_001');
      expect(shop.name).toBe('Test Shop 1');
      expect(shop.slug).toBe('test-shop-001');
      expect(shop.isActive).toBe(true);
    });

    it('should create shop with null/default relation fields', () => {
      const shop = createShop();

      expect(shop.ownerId).toBeNull();
      expect(shop.owner).toBeNull();
      expect(shop.description).toBeNull();
      expect(shop.address).toBeNull();
      expect(shop.phone).toBeNull();
    });

    it('should create shop with empty arrays for collections', () => {
      const shop = createShop();

      expect(shop.chatEvents).toEqual([]);
      expect(shop.storefrontViews).toEqual([]);
      expect(shop.orders).toEqual([]);
    });

    it('should create shop with custom index', () => {
      const shop = createShop({ index: 5 });

      expect(shop.id).toBe('shop_005');
      expect(shop.name).toBe('Test Shop 5');
      expect(shop.slug).toBe('test-shop-005');
    });

    it('should allow overriding name independently', () => {
      const shop = createShop({ name: 'My Custom Shop' });

      expect(shop.name).toBe('My Custom Shop');
      expect(shop.slug).toBe('test-shop-001');
    });

    it('should allow overriding slug independently', () => {
      const shop = createShop({ slug: 'my-custom-slug' });

      expect(shop.slug).toBe('my-custom-slug');
    });

    it('should allow overriding isActive status', () => {
      const shop = createShop({ isActive: false });

      expect(shop.isActive).toBe(false);
    });

    it('should create shop with createdAt timestamp', () => {
      const shop = createShop();

      expect(shop.createdAt).toBeInstanceOf(Date);
    });

    it('should exclude index from resulting object', () => {
      const shop = createShop({ index: 1 });

      expect('index' in shop).toBe(false);
    });

    it('should allow setting ownerId', () => {
      const shop = createShop({ ownerId: 'user_001' });

      expect(shop.ownerId).toBe('user_001');
    });
  });

  describe('createShops', () => {
    it('should create specified number of shops', () => {
      const shops = createShops(3);

      expect(shops).toHaveLength(3);
    });

    it('should create shops with sequential indices', () => {
      const shops = createShops(3);

      expect(shops[0].id).toBe('shop_001');
      expect(shops[1].id).toBe('shop_002');
      expect(shops[2].id).toBe('shop_003');
    });

    it('should generate unique names for each shop', () => {
      const shops = createShops(3);

      const names = shops.map((s) => s.name);
      expect(new Set(names).size).toBe(3);
    });

    it('should generate unique slugs for each shop', () => {
      const shops = createShops(3);

      const slugs = shops.map((s) => s.slug);
      expect(new Set(slugs).size).toBe(3);
    });

    it('should apply overrides to all shops', () => {
      const shops = createShops(2, { isActive: false });

      expect(shops[0].isActive).toBe(false);
      expect(shops[1].isActive).toBe(false);
    });

    it('should create shops with distinct IDs', () => {
      const shops = createShops(3);

      const ids = shops.map((s) => s.id);
      expect(new Set(ids).size).toBe(3);
    });
  });
});
