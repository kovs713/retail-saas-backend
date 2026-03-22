import { Shop } from '@/modules/shop/entities/shop.entity';
import { User } from '@/modules/user/entities/user.entity';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';

import { createMock } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

jest.mock('@/core/logger/logger.service', () => ({
  LoggerService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: ReturnType<typeof createMock<Repository<Category>>>;

  const mockShopId = 'shop-123';
  const mockShop: Shop = {
    id: mockShopId,
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
  } as Shop;

  const mockCategory: Category = {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    shopId: mockShopId,
    shop: mockShop,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: createMock<Repository<Category>>(),
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Electronics',
      slug: 'electronics',
    };

    it('should create a category successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockCategory);
      repository.save.mockResolvedValue(mockCategory);

      const result = await service.create(mockShopId, createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          shopId: mockShopId,
          slug: createDto.slug,
        },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        shopId: mockShopId,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException when category slug exists', async () => {
      repository.findOne.mockResolvedValue(mockCategory);

      await expect(service.create(mockShopId, createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(mockShopId, createDto)).rejects.toThrow(
        'Category with slug "electronics" already exists for this shop',
      );
    });
  });

  describe('findAll', () => {
    it('should return all categories for a shop', async () => {
      repository.find.mockResolvedValue([mockCategory]);

      const result = await service.findAll(mockShopId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { shopId: mockShopId },
        order: { name: 'ASC' },
      });
      expect(result).toEqual([mockCategory]);
    });

    it('should return empty array when no categories', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll(mockShopId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      repository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-1', mockShopId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1', shopId: mockShopId },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockShopId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent', mockShopId)).rejects.toThrow(
        'Category with ID "non-existent" not found',
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Electronics',
      description: 'Updated description',
    };

    it('should update a category successfully', async () => {
      repository.findOne.mockResolvedValueOnce(mockCategory);
      repository.save.mockResolvedValue({ ...mockCategory, ...updateDto });

      const result = await service.update('cat-1', mockShopId, updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1', shopId: mockShopId },
      });
      expect(result.name).toBe('Updated Electronics');
    });

    it('should throw NotFoundException for non-existent category', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', mockShopId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing slug', async () => {
      const existingCategory = { ...mockCategory, id: 'cat-2' };
      repository.findOne.mockResolvedValueOnce(mockCategory);
      repository.findOne.mockResolvedValueOnce(existingCategory);

      await expect(service.update('cat-1', mockShopId, { slug: 'electronics' })).rejects.toThrow(ConflictException);
      await expect(service.update('cat-1', mockShopId, { slug: 'electronics' })).rejects.toThrow(
        'Category with slug "electronics" already exists for this shop',
      );
    });

    it('should allow updating category with same slug', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce({ ...mockCategory, ...updateDto });
      repository.save.mockResolvedValue({ ...mockCategory, ...updateDto });

      const result = await service.update('cat-1', mockShopId, { ...updateDto, slug: 'electronics' });

      expect(result).toEqual({ ...mockCategory, ...updateDto });
    });
  });

  describe('remove', () => {
    it('should delete a category successfully', async () => {
      repository.findOne.mockResolvedValue(mockCategory);
      repository.remove.mockResolvedValue(mockCategory);

      await service.remove('cat-1', mockShopId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1', shopId: mockShopId },
      });
      expect(repository.remove).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw NotFoundException for non-existent category', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockShopId)).rejects.toThrow(NotFoundException);
    });
  });
});
