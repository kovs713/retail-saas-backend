import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { createShop } from '@/core/database/factories';
import { LocationRepository, ShopRepository } from './repositories';
import { ShopService } from './shop.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('ShopService', () => {
  let service: ShopService;
  let repository: DeepMocked<ShopRepository>;
  let cacheService: DeepMocked<CacheService>;

  const mockShop = createShop({
    id: 'shop_001',
    name: 'Test Shop',
    slug: 'test-shop',
    ownerId: 'owner_001',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        {
          provide: ShopRepository,
          useValue: createMock<ShopRepository>(),
        },
        {
          provide: LocationRepository,
          useValue: createMock<LocationRepository>(),
        },
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
    repository = module.get(ShopRepository);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Test Shop',
      slug: 'test-shop',
      ownerId: 'owner_001',
    };

    it('should create a shop successfully', async () => {
      repository.existsBySlug.mockResolvedValue(false);
      repository.create.mockReturnValue(mockShop);
      repository.save.mockResolvedValue(mockShop);

      const result = await service.create(createDto);

      expect(result).toEqual(mockShop);
    });

    it('should throw ConflictException when shop slug exists', async () => {
      repository.existsBySlug.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Shop with this slug already exists',
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a shop by slug', async () => {
      repository.findBySlug.mockResolvedValue(mockShop);

      const result = await service.findBySlug('test-shop');

      expect(result).toEqual(mockShop);
    });

    it('should throw NotFoundException when shop not found', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findBySlug('non-existent')).rejects.toThrow(
        'Shop not found',
      );
    });
  });

  describe('findById', () => {
    it('should return a shop by id', async () => {
      repository.findById.mockResolvedValue(mockShop);

      const result = await service.findById('shop_001');

      expect(result).toEqual(mockShop);
    });

    it('should throw NotFoundException when shop not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('non-existent')).rejects.toThrow(
        'Shop not found',
      );
    });
  });

  describe('findByOwnerId', () => {
    it('should return a shop by owner id', async () => {
      repository.findByOwnerId.mockResolvedValue(mockShop);

      const result = await service.findByOwnerId('owner_001');

      expect(result).toEqual(mockShop);
    });

    it('should return null when shop not found', async () => {
      repository.findByOwnerId.mockResolvedValue(null);

      const result = await service.findByOwnerId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Shop',
      description: 'Updated description',
    };

    it('should update a shop successfully', async () => {
      repository.findById.mockResolvedValue({ ...mockShop });
      repository.save.mockResolvedValue({ ...mockShop, ...updateDto });

      const result = await service.update('shop_001', updateDto);

      expect(result.name).toBe('Updated Shop');
      expect(result.description).toBe('Updated description');
    });

    it('should invalidate old and new slug cache when slug changes', async () => {
      const updatedShop = { ...mockShop, slug: 'updated-shop' };
      repository.findById.mockResolvedValue({ ...mockShop });
      repository.save.mockResolvedValue(updatedShop);

      await service.update('shop_001', { slug: 'updated-shop' });

      expect(cacheService.del).toHaveBeenCalledWith(
        cacheService.generateKey('shop', 'slug', 'test-shop'),
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        cacheService.generateKey('shop', 'slug', 'updated-shop'),
      );
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOwner', () => {
    it('should update shop owner successfully', async () => {
      repository.findById.mockResolvedValue({ ...mockShop });
      repository.save.mockResolvedValue({ ...mockShop, ownerId: 'new-owner' });

      const result = await service.updateOwner('shop_001', 'new-owner');

      expect(result.ownerId).toBe('new-owner');
    });

    it('should invalidate old and new owner cache when owner changes', async () => {
      repository.findById.mockResolvedValue({ ...mockShop });
      repository.save.mockResolvedValue({ ...mockShop, ownerId: 'new-owner' });

      await service.updateOwner('shop_001', 'new-owner');

      expect(cacheService.del).toHaveBeenCalledWith(
        cacheService.generateKey('shop', 'owner', 'owner_001'),
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        cacheService.generateKey('shop', 'owner', 'new-owner'),
      );
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateOwner('non-existent', 'new-owner'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMediaUrls', () => {
    it('should update logo URL only', async () => {
      repository.findById.mockResolvedValue({ ...mockShop });
      repository.save.mockResolvedValue({
        ...mockShop,
        logoUrl: 'https://example.com/logo.png',
      });

      const result = await service.updateMediaUrls(
        'shop_001',
        'https://example.com/logo.png',
      );

      expect(result.logoUrl).toBe('https://example.com/logo.png');
      expect(result.bannerUrl).toBeNull();
    });

    it('should update banner URL only', async () => {
      const shopWithNullLogo = { ...mockShop, logoUrl: null };
      repository.findById.mockResolvedValue(shopWithNullLogo);
      repository.save.mockResolvedValue({
        ...shopWithNullLogo,
        bannerUrl: 'https://example.com/banner.png',
      });

      const result = await service.updateMediaUrls(
        'shop_001',
        undefined,
        'https://example.com/banner.png',
      );

      expect(result.logoUrl).toBeNull();
      expect(result.bannerUrl).toBe('https://example.com/banner.png');
    });

    it('should update both logo and banner URLs', async () => {
      repository.findById.mockResolvedValue({ ...mockShop });
      repository.save.mockResolvedValue({
        ...mockShop,
        logoUrl: 'https://example.com/logo.png',
        bannerUrl: 'https://example.com/banner.png',
      });

      const result = await service.updateMediaUrls(
        'shop_001',
        'https://example.com/logo.png',
        'https://example.com/banner.png',
      );

      expect(result.logoUrl).toBe('https://example.com/logo.png');
      expect(result.bannerUrl).toBe('https://example.com/banner.png');
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateMediaUrls('non-existent', 'logo.png'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleActive', () => {
    it('should toggle shop from active to inactive', async () => {
      const inactiveShop = { ...mockShop, isActive: false };
      repository.findById.mockResolvedValue({ ...mockShop });
      repository.save.mockResolvedValue(inactiveShop);

      const result = await service.toggleActive('shop_001');

      expect(result.isActive).toBe(false);
    });

    it('should toggle shop from inactive to active', async () => {
      const inactiveShop = { ...mockShop, isActive: false };
      const activeShop = { ...mockShop, isActive: true };
      repository.findById.mockResolvedValue(inactiveShop);
      repository.save.mockResolvedValue(activeShop);

      const result = await service.toggleActive('shop_001');

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.toggleActive('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
