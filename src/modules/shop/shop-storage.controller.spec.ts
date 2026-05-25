import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { ObjectStorageService } from '@/core/object-storage/object-storage.service';
import { User } from '@/modules/user/entities';
import { Shop } from './entities';
import { ShopStorageController } from './shop-storage.controller';
import { ShopService } from './shop.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('ShopStorageController', () => {
  let controller: ShopStorageController;
  let shopService: DeepMocked<ShopService>;
  let storageService: DeepMocked<ObjectStorageService>;

  const tenantContext = { shopId: 'shop-1' };
  const ownerRequest = { user: { role: Role.OWNER } } as any;
  const adminRequest = { user: { role: Role.ADMIN } } as any;

  const mockShop: Shop = {
    id: 'shop-1',
    ownerId: 'owner-1',
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
    locations: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ShopService, useValue: createMock<ShopService>() },
        {
          provide: ObjectStorageService,
          useValue: createMock<ObjectStorageService>(),
        },
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
        Reflector,
      ],
      controllers: [ShopStorageController],
    })
      .overrideGuard(AuthGuard)
      .useValue(
        mockAuthGuard({
          sub: 'owner-1',
          email: 'test@example.com',
          shopId: 'shop-1',
          role: Role.OWNER,
        }),
      )
      .overrideGuard(RolesGuard)
      .useValue(mockGuard())
      .compile();

    controller = module.get(ShopStorageController);
    shopService = module.get(ShopService);
    storageService = module.get(ObjectStorageService);

    shopService.findById.mockResolvedValue(mockShop);
    storageService.getPresignedPutUrl.mockResolvedValue('https://s3/upload');
    storageService.getPublicUrl.mockReturnValue(
      'https://s3/bucket/shops/shop-1/logo/logo.png',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns presigned logo upload URL', async () => {
    const result = await controller.getLogoPresignedUrl(
      'shop-1',
      'logo.png',
      tenantContext,
      ownerRequest,
    );

    expect(shopService.findById).toHaveBeenCalledWith('shop-1');
    expect(storageService.getPresignedPutUrl).toHaveBeenCalledWith(
      'shops/shop-1/logo/logo.png',
      900,
    );
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'shops/shop-1/logo/logo.png',
    );
    expect(result).toEqual({
      uploadUrl: 'https://s3/upload',
      publicUrl: 'https://s3/bucket/shops/shop-1/logo/logo.png',
    });
  });

  it('returns presigned banner upload URL', async () => {
    await controller.getBannerPresignedUrl(
      'shop-1',
      'banner.png',
      tenantContext,
      ownerRequest,
    );

    expect(storageService.getPresignedPutUrl).toHaveBeenCalledWith(
      'shops/shop-1/banner/banner.png',
      900,
    );
  });

  it('sanitizes filename before building key', async () => {
    await controller.getLogoPresignedUrl(
      'shop-1',
      'my logo.png',
      tenantContext,
      ownerRequest,
    );

    expect(storageService.getPresignedPutUrl).toHaveBeenCalledWith(
      'shops/shop-1/logo/my-logo.png',
      900,
    );
  });

  it('rejects owner requesting another shop', async () => {
    await expect(
      controller.getLogoPresignedUrl(
        'shop-2',
        'logo.png',
        tenantContext,
        ownerRequest,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(shopService.findById).not.toHaveBeenCalled();
  });

  it('allows admin requesting another shop', async () => {
    await controller.getLogoPresignedUrl(
      'shop-2',
      'logo.png',
      { shopId: 'shop-1' },
      adminRequest,
    );

    expect(shopService.findById).toHaveBeenCalledWith('shop-2');
  });

  it('rejects empty filename', async () => {
    await expect(
      controller.getLogoPresignedUrl('shop-1', '', tenantContext, ownerRequest),
    ).rejects.toThrow(BadRequestException);
  });
});
