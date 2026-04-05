import { createShop } from '@/core/database/factories';
import { ShopDto } from './shop.dto';
import { Shop } from '../entities';

describe('ShopDto', () => {
  const createMockShop = (overrides: Partial<Shop> = {}): Shop => {
    const base = createShop({
      id: 'shop_001',
      name: 'Test Shop',
      slug: 'test-shop',
      description: 'Test description',
      address: 'Test address',
      phone: '+123456789',
      workingHours: { mon: '9-18' } as any,
      logoUrl: 'https://example.com/logo.png',
      bannerUrl: 'https://example.com/banner.png',
      ownerId: 'owner_001',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    });
    return base as unknown as Shop;
  };

  describe('fromEntity', () => {
    it('should transform Date fields to ISO strings', () => {
      const shop = createMockShop();

      const dto = ShopDto.fromEntity(shop);

      expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should pass through string date values', () => {
      const shop = createMockShop({ createdAt: '2024-06-15T12:00:00.000Z' as any });

      const dto = ShopDto.fromEntity(shop);

      expect(dto.createdAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('should return undefined for non-date non-string values', () => {
      const shop = createMockShop({ createdAt: 12345 as any });

      const dto = ShopDto.fromEntity(shop);

      expect(dto.createdAt).toBeUndefined();
    });

    it('should transform all fields correctly', () => {
      const shop = createMockShop();

      const dto = ShopDto.fromEntity(shop);

      expect(dto.id).toBe('shop_001');
      expect(dto.name).toBe('Test Shop');
      expect(dto.slug).toBe('test-shop');
      expect(dto.isActive).toBe(true);
    });
  });

  describe('fromEntities', () => {
    it('should transform multiple shops to DTOs', () => {
      const shops = [
        createMockShop({ id: 'shop_001', name: 'Shop 1' }),
        createMockShop({ id: 'shop_002', name: 'Shop 2' }),
      ];

      const dtos = ShopDto.fromEntities(shops);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].name).toBe('Shop 1');
      expect(dtos[1].name).toBe('Shop 2');
    });

    it('should return empty array for empty input', () => {
      const dtos = ShopDto.fromEntities([]);

      expect(dtos).toHaveLength(0);
    });
  });
});
