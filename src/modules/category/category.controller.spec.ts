import { RolesGuard } from '@/common/guards';
import { Shop } from '@/modules/shop/entities/shop.entity';
import { User } from '@/modules/user/entities/user.entity';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Category } from './entities/category.entity';

import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  const mockShopId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCategoryId = '123e4567-e89b-12d3-a456-426614174001';

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
    id: mockCategoryId,
    name: 'Electronics',
    slug: 'electronics',
    shopId: mockShopId,
    shop: mockShop,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-secret') },
        },
        Reflector,
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      name: 'Electronics',
      slug: 'electronics',
    };

    it('should create a category successfully', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockCategory);

      const result = await controller.create(mockShopId, createDto);

      expect(service.create).toHaveBeenCalledWith(mockShopId, createDto);
      expect(result).toEqual(mockCategory);
    });

    it('should handle ConflictException', async () => {
      jest.spyOn(service, 'create').mockRejectedValue(new ConflictException('Category slug already exists'));

      await expect(controller.create(mockShopId, createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all categories for a shop', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([mockCategory]);

      const result = await controller.findAll(mockShopId);

      expect(service.findAll).toHaveBeenCalledWith(mockShopId);
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockCategory);

      const result = await controller.findOne(mockShopId, mockCategoryId);

      expect(service.findOne).toHaveBeenCalledWith(mockCategoryId, mockShopId);
      expect(result).toEqual(mockCategory);
    });

    it('should handle NotFoundException', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.findOne(mockShopId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Electronics',
    };

    it('should update a category successfully', async () => {
      const updatedCategory = { ...mockCategory, ...updateDto };
      jest.spyOn(service, 'update').mockResolvedValue(updatedCategory);

      const result = await controller.update(mockShopId, mockCategoryId, updateDto);

      expect(service.update).toHaveBeenCalledWith(mockCategoryId, mockShopId, updateDto);
      expect(result).toEqual(updatedCategory);
    });

    it('should handle NotFoundException', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.update(mockShopId, 'non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle ConflictException', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new ConflictException('Category slug already exists'));

      await expect(controller.update(mockShopId, mockCategoryId, { slug: 'existing' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a category successfully', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue();

      await controller.remove(mockShopId, mockCategoryId);

      expect(service.remove).toHaveBeenCalledWith(mockCategoryId, mockShopId);
    });

    it('should handle NotFoundException', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.remove(mockShopId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
