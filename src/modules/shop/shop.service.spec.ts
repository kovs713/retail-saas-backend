import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { User } from '@/modules/user/entities/user.entity';
import { Shop } from './entities/shop.entity';
import { ShopService } from './shop.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('ShopService', () => {
  let service: ShopService;
  let repository: DeepMocked<Repository<Shop>>;

  const mockShop: Shop = {
    id: 'shop-1',
    ownerId: 'owner-123',
    owner: null as unknown as User,
    name: 'Test Shop',
    slug: 'test-shop',
    description: null,
    address: null,
    phone: null,
    workingHours: null,
    logoUrl: null,
    bannerUrl: null,
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        {
          provide: getRepositoryToken(Shop),
          useValue: createMock<Repository<Shop>>(),
        },
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
    repository = module.get(getRepositoryToken(Shop));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Test Shop',
      slug: 'test-shop',
      ownerId: 'owner-123',
    };

    it('should create a shop successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockShop);
      repository.save.mockResolvedValue(mockShop);

      const result = await service.create(createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { slug: createDto.slug },
      });
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockShop);
    });

    it('should throw ConflictException when shop slug exists', async () => {
      repository.findOne.mockResolvedValue(mockShop);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow('Shop with this slug already exists');
    });
  });

  describe('findBySlug', () => {
    it('should return a shop by slug', async () => {
      repository.findOne.mockResolvedValue(mockShop);

      const result = await service.findBySlug('test-shop');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { slug: 'test-shop' } });
      expect(result).toEqual(mockShop);
    });

    it('should throw NotFoundException when shop not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findBySlug('non-existent')).rejects.toThrow('Shop not found');
    });
  });

  describe('findById', () => {
    it('should return a shop by id', async () => {
      repository.findOne.mockResolvedValue(mockShop);

      const result = await service.findById('shop-1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'shop-1' } });
      expect(result).toEqual(mockShop);
    });

    it('should throw NotFoundException when shop not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('non-existent')).rejects.toThrow('Shop not found');
    });
  });

  describe('findByOwnerId', () => {
    it('should return a shop by owner id', async () => {
      repository.findOne.mockResolvedValue(mockShop);

      const result = await service.findByOwnerId('owner-123');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { ownerId: 'owner-123' } });
      expect(result).toEqual(mockShop);
    });

    it('should return null when shop not found', async () => {
      repository.findOne.mockResolvedValue(null);

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
      repository.findOne.mockResolvedValue(mockShop);
      repository.save.mockResolvedValue({ ...mockShop, ...updateDto });

      const result = await service.update('shop-1', updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'shop-1' } });
      expect(result.name).toBe('Updated Shop');
      expect(result.description).toBe('Updated description');
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOwner', () => {
    it('should update shop owner successfully', async () => {
      repository.findOne.mockResolvedValue(mockShop);
      repository.save.mockResolvedValue({ ...mockShop, ownerId: 'new-owner' });

      const result = await service.updateOwner('shop-1', 'new-owner');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'shop-1' } });
      expect(result.ownerId).toBe('new-owner');
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateOwner('non-existent', 'new-owner')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMediaUrls', () => {
    it('should update logo URL only', async () => {
      repository.findOne.mockResolvedValue(mockShop);
      repository.save.mockResolvedValue({ ...mockShop, logoUrl: 'https://example.com/logo.png' });

      const result = await service.updateMediaUrls('shop-1', 'https://example.com/logo.png');

      expect(result.logoUrl).toBe('https://example.com/logo.png');
      expect(result.bannerUrl).toBeNull();
    });

    it('should update banner URL only', async () => {
      const shopWithNullLogo = { ...mockShop, logoUrl: null };
      repository.findOne.mockResolvedValue(shopWithNullLogo);
      repository.save.mockResolvedValue({ ...shopWithNullLogo, bannerUrl: 'https://example.com/banner.png' });

      const result = await service.updateMediaUrls('shop-1', undefined, 'https://example.com/banner.png');

      expect(result.logoUrl).toBeNull();
      expect(result.bannerUrl).toBe('https://example.com/banner.png');
    });

    it('should update both logo and banner URLs', async () => {
      repository.findOne.mockResolvedValue(mockShop);
      repository.save.mockResolvedValue({
        ...mockShop,
        logoUrl: 'https://example.com/logo.png',
        bannerUrl: 'https://example.com/banner.png',
      });

      const result = await service.updateMediaUrls(
        'shop-1',
        'https://example.com/logo.png',
        'https://example.com/banner.png',
      );

      expect(result.logoUrl).toBe('https://example.com/logo.png');
      expect(result.bannerUrl).toBe('https://example.com/banner.png');
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateMediaUrls('non-existent', 'logo.png')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleActive', () => {
    it('should toggle shop from active to inactive', async () => {
      const inactiveShop = { ...mockShop, isActive: false };
      repository.findOne.mockResolvedValue(mockShop);
      repository.save.mockResolvedValue(inactiveShop);

      const result = await service.toggleActive('shop-1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'shop-1' } });
      expect(result.isActive).toBe(false);
    });

    it('should toggle shop from inactive to active', async () => {
      const inactiveShop = { ...mockShop, isActive: false };
      const activeShop = { ...mockShop, isActive: true };
      repository.findOne.mockResolvedValue(inactiveShop);
      repository.save.mockResolvedValue(activeShop);

      const result = await service.toggleActive('shop-1');

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.toggleActive('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
