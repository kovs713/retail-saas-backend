import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { User } from '@/modules/user/entities';
import { CreateShopDto, ShopDto, UpdateShopDto } from './dto';
import { Shop } from './entities';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

import { createMock } from '@golevelup/ts-jest';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('ShopController', () => {
  let controller: ShopController;
  let service: ShopService;

  const ownerTenantContext = {
    shopId: 'shop-1',
  };

  const otherTenantContext = {
    shopId: 'shop-2',
  };

  const adminRequest = {
    user: {
      role: Role.ADMIN,
    },
  } as any;

  const ownerRequest = {
    user: {
      role: Role.OWNER,
    },
  } as any;

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
    chatEvents: [],
    storefrontViews: [],
    orders: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ShopService,
          useValue: createMock<ShopService>(),
        },
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        Reflector,
      ],
      controllers: [ShopController],
    })
      .overrideGuard(AuthGuard)
      .useValue(
        mockAuthGuard({
          sub: 'user-123',
          email: 'test@example.com',
          shopId: 'shop-456',
          role: 'owner',
        }),
      )
      .overrideGuard(RolesGuard)
      .useValue(mockGuard())
      .compile();

    controller = module.get<ShopController>(ShopController);
    service = module.get<ShopService>(ShopService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateShopDto = {
      name: 'Test Shop',
      slug: 'test-shop',
      ownerId: 'owner-123',
    };

    it('should create a shop successfully', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockShop);
      const expectedDto = ShopDto.fromEntity(mockShop);
      const expectedResult = {
        success: true,
        data: expectedDto,
        message: 'Shop created successfully',
      };

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findBySlug', () => {
    it('should return a shop by slug', async () => {
      jest.spyOn(service, 'findBySlug').mockResolvedValue(mockShop);
      const expectedDto = ShopDto.fromEntity(mockShop);
      const expectedResult = { success: true, data: expectedDto };

      const result = await controller.findBySlug('test-shop');

      expect(service.findBySlug).toHaveBeenCalledWith('test-shop');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findById', () => {
    it('should return a shop by id', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockShop);
      const expectedDto = ShopDto.fromEntity(mockShop);
      const expectedResult = { success: true, data: expectedDto };

      const result = await controller.findById('shop-1');

      expect(service.findById).toHaveBeenCalledWith('shop-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    const updateDto: UpdateShopDto = {
      name: 'Updated Shop',
      description: 'Updated description',
    };

    it('should update a shop successfully', async () => {
      const updatedShop = { ...mockShop, ...updateDto };
      jest.spyOn(service, 'update').mockResolvedValue(updatedShop);
      const expectedDto = ShopDto.fromEntity(updatedShop);
      const expectedResult = {
        success: true,
        data: expectedDto,
        message: 'Shop updated successfully',
      };

      const result = await controller.update(
        'shop-1',
        updateDto,
        ownerTenantContext,
        ownerRequest,
      );

      expect(service.update).toHaveBeenCalledWith('shop-1', updateDto);
      expect(result).toEqual(expectedResult);
    });

    it('should reject owner updating another shop', async () => {
      await expect(
        controller.update(
          'shop-2',
          updateDto,
          ownerTenantContext,
          ownerRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('should allow admin updating another shop', async () => {
      const updatedShop = { ...mockShop, ...updateDto, id: 'shop-2' };
      jest.spyOn(service, 'update').mockResolvedValue(updatedShop);

      await controller.update(
        'shop-2',
        updateDto,
        otherTenantContext,
        adminRequest,
      );

      expect(service.update).toHaveBeenCalledWith('shop-2', updateDto);
    });
  });

  describe('updateMedia', () => {
    it('should update shop logo URL', async () => {
      const logoUrl = 'https://example.com/logo.png';
      const updatedShop = { ...mockShop, logoUrl };
      jest.spyOn(service, 'updateMediaUrls').mockResolvedValue(updatedShop);
      const expectedDto = ShopDto.fromEntity(updatedShop);
      const expectedResult = {
        success: true,
        data: expectedDto,
        message: 'Shop media URLs updated successfully',
      };

      const result = await controller.updateMedia(
        'shop-1',
        ownerTenantContext,
        ownerRequest,
        logoUrl,
        undefined,
      );

      expect(service.updateMediaUrls).toHaveBeenCalledWith(
        'shop-1',
        logoUrl,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should update shop banner URL', async () => {
      const bannerUrl = 'https://example.com/banner.png';
      const updatedShop = { ...mockShop, bannerUrl };
      jest.spyOn(service, 'updateMediaUrls').mockResolvedValue(updatedShop);
      const expectedDto = ShopDto.fromEntity(updatedShop);
      const expectedResult = {
        success: true,
        data: expectedDto,
        message: 'Shop media URLs updated successfully',
      };

      const result = await controller.updateMedia(
        'shop-1',
        ownerTenantContext,
        ownerRequest,
        undefined,
        bannerUrl,
      );

      expect(service.updateMediaUrls).toHaveBeenCalledWith(
        'shop-1',
        undefined,
        bannerUrl,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should update both logo and banner URLs', async () => {
      const logoUrl = 'https://example.com/logo.png';
      const bannerUrl = 'https://example.com/banner.png';
      const updatedShop = { ...mockShop, logoUrl, bannerUrl };
      jest.spyOn(service, 'updateMediaUrls').mockResolvedValue(updatedShop);
      const expectedDto = ShopDto.fromEntity(updatedShop);
      const expectedResult = {
        success: true,
        data: expectedDto,
        message: 'Shop media URLs updated successfully',
      };

      const result = await controller.updateMedia(
        'shop-1',
        ownerTenantContext,
        ownerRequest,
        logoUrl,
        bannerUrl,
      );

      expect(service.updateMediaUrls).toHaveBeenCalledWith(
        'shop-1',
        logoUrl,
        bannerUrl,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should clear media URLs with null values', async () => {
      const updatedShop = { ...mockShop, logoUrl: null, bannerUrl: null };
      jest.spyOn(service, 'updateMediaUrls').mockResolvedValue(updatedShop);

      await controller.updateMedia(
        'shop-1',
        ownerTenantContext,
        ownerRequest,
        null,
        null,
      );

      expect(service.updateMediaUrls).toHaveBeenCalledWith(
        'shop-1',
        null,
        null,
      );
    });

    it('should reject owner updating media for another shop', async () => {
      await expect(
        controller.updateMedia(
          'shop-2',
          ownerTenantContext,
          ownerRequest,
          'https://example.com/logo.png',
          undefined,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(service.updateMediaUrls).not.toHaveBeenCalled();
    });

    it('should allow admin updating media for another shop', async () => {
      jest.spyOn(service, 'updateMediaUrls').mockResolvedValue({
        ...mockShop,
        id: 'shop-2',
        logoUrl: 'https://example.com/logo.png',
      });

      await controller.updateMedia(
        'shop-2',
        otherTenantContext,
        adminRequest,
        'https://example.com/logo.png',
        undefined,
      );

      expect(service.updateMediaUrls).toHaveBeenCalledWith(
        'shop-2',
        'https://example.com/logo.png',
        undefined,
      );
    });
  });
});
