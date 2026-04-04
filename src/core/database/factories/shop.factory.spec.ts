import { createShop, createShops } from './shop.factory';

describe('ShopFactory', () => {
  describe('createShop', () => {
    it('should create a shop with default values', () => {
      const shop = createShop();

      expect(shop.name).toBe('Test Shop 1');
      expect(shop.slug).toBe('test-shop-001');
      expect(shop.description).toBeNull();
      expect(shop.address).toBeNull();
      expect(shop.phone).toBeNull();
      expect(shop.isActive).toBe(true);
      expect(shop.workingHours).toBeNull();
    });

    it('should create a shop with custom options', () => {
      const shop = createShop({
        overrides: {
          name: 'My Custom Shop',
          slug: 'my-custom-shop',
          description: 'Custom description',
          ownerId: 'owner-123',
        },
      });

      expect(shop.name).toBe('My Custom Shop');
      expect(shop.slug).toBe('my-custom-shop');
      expect(shop.description).toBe('Custom description');
      expect(shop.ownerId).toBe('owner-123');
    });

    it('should have null ownerId when not provided', () => {
      const shop = createShop();

      expect(shop.ownerId).toBeNull();
    });

    it('should include workingHours when provided', () => {
      const shop = createShop({
        overrides: {
          workingHours: {
            monday: '09:00-21:00',
            tuesday: '09:00-21:00',
            wednesday: '09:00-21:00',
            thursday: '09:00-21:00',
            friday: '09:00-21:00',
            saturday: '10:00-20:00',
            sunday: '10:00-18:00',
          },
        },
      });

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
    it('should create multiple shops with unique names', () => {
      const shops = createShops(3);

      expect(shops).toHaveLength(3);
      expect(shops[0].name).toBe('Test Shop 1');
      expect(shops[1].name).toBe('Test Shop 2');
      expect(shops[2].name).toBe('Test Shop 3');
    });
  });
});
