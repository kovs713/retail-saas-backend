import { createShop, createShops } from '@/core/database/factories';

describe('ShopFactory', () => {
  describe('createShop', () => {
    it('should create a shop with default values', () => {
      const shop = createShop();

      expect(shop.name).toBe('Test Shop');
      expect(shop.slug).toBe('test-shop');
      expect(shop.description).toBe('A test shop description');
      expect(shop.address).toBe('123 Test Street');
      expect(shop.phone).toBe('+1234567890');
      expect(shop.isActive).toBe(true);
      expect(shop.workingHours).toBeDefined();
      expect(shop.workingHours?.monday).toBe('09:00-21:00');
    });

    it('should create a shop with custom options', () => {
      const shop = createShop({
        name: 'My Custom Shop',
        slug: 'my-custom-shop',
        description: 'Custom description',
        ownerId: 'owner-123',
      });

      expect(shop.name).toBe('My Custom Shop');
      expect(shop.slug).toBe('my-custom-shop');
      expect(shop.description).toBe('Custom description');
      expect(shop.ownerId).toBe('owner-123');
    });

    it('should not include ownerId when not provided', () => {
      const shop = createShop();

      expect(shop.ownerId).toBeUndefined();
    });

    it('should include workingHours with all days', () => {
      const shop = createShop();

      expect(shop.workingHours?.monday).toBe('09:00-21:00');
      expect(shop.workingHours?.tuesday).toBe('09:00-21:00');
      expect(shop.workingHours?.wednesday).toBe('09:00-21:00');
      expect(shop.workingHours?.thursday).toBe('09:00-21:00');
      expect(shop.workingHours?.friday).toBe('09:00-21:00');
      expect(shop.workingHours?.saturday).toBe('10:00-20:00');
      expect(shop.workingHours?.sunday).toBe('10:00-18:00');
    });
  });

  describe('createShops', () => {
    it('should create multiple shops', () => {
      const shops = createShops(3);

      expect(shops).toHaveLength(3);
      expect(shops[0].name).toBe('Test Shop');
      expect(shops[1].name).toBe('Test Shop');
      expect(shops[2].name).toBe('Test Shop');
    });
  });
});
