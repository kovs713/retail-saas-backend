import { ShopDto } from './shop.dto';

describe('ShopDto', () => {
  const mockShopEntity = {
    id: 'shop-1',
    name: 'Test Shop',
    slug: 'test-shop',
    description: 'A test shop',
    address: '123 Main St',
    phone: '+1234567890',
    workingHours: { monday: '9-17' },
    logoUrl: 'https://example.com/logo.png',
    bannerUrl: 'https://example.com/banner.png',
    isActive: true,
    ownerId: 'owner-1',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  describe('fromEntity', () => {
    it('should convert entity to DTO', () => {
      const dto = ShopDto.fromEntity(mockShopEntity as any);

      expect(dto.id).toBe('shop-1');
      expect(dto.name).toBe('Test Shop');
      expect(dto.slug).toBe('test-shop');
      expect(dto.isActive).toBe(true);
      expect(dto.ownerId).toBe('owner-1');
    });

    it('should transform dates to ISO strings', () => {
      const dto = ShopDto.fromEntity(mockShopEntity as any);

      expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should handle null optional fields', () => {
      const entity = {
        ...mockShopEntity,
        description: null,
        address: null,
        phone: null,
        workingHours: null,
        logoUrl: null,
        bannerUrl: null,
        ownerId: null,
        updatedAt: undefined,
      };

      const dto = ShopDto.fromEntity(entity as any);

      expect(dto.description).toBeNull();
      expect(dto.address).toBeNull();
      expect(dto.logoUrl).toBeNull();
      expect(dto.ownerId).toBeNull();
    });
  });

  describe('fromEntities', () => {
    it('should convert multiple entities to DTOs', () => {
      const entities = [mockShopEntity, { ...mockShopEntity, id: 'shop-2' }];

      const dtos = ShopDto.fromEntities(entities as any);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe('shop-1');
      expect(dtos[1].id).toBe('shop-2');
    });

    it('should return empty array for empty input', () => {
      const dtos = ShopDto.fromEntities([]);

      expect(dtos).toHaveLength(0);
    });
  });
});
