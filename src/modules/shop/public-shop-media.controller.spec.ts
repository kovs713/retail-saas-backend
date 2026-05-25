import { ObjectStorageService } from '@/core/object-storage/object-storage.service';
import { User } from '@/modules/user/entities';
import { Shop } from './entities';
import { PublicShopMediaController } from './public-shop-media.controller';
import { ShopService } from './shop.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { Readable } from 'stream';

describe('PublicShopMediaController', () => {
  let controller: PublicShopMediaController;
  let shopService: DeepMocked<ShopService>;
  let storageService: DeepMocked<ObjectStorageService>;

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
    shopService = createMock<DeepMocked<ShopService>>();
    storageService = createMock<DeepMocked<ObjectStorageService>>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicShopMediaController],
      providers: [
        { provide: ShopService, useValue: shopService },
        { provide: ObjectStorageService, useValue: storageService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PublicShopMediaController);
  });

  it('should stream shop media with headers', async () => {
    const res = createMock<Response>();
    const stream = new Readable({ read() {} });
    jest.spyOn(stream, 'pipe').mockReturnValue(res as any);
    shopService.findBySlug.mockResolvedValue(mockShop);
    storageService.getObjectStream.mockResolvedValue(stream);
    storageService.statObject.mockResolvedValue({
      size: 11,
      contentType: 'image/jpeg',
      lastModified: new Date('2025-01-01T00:00:00.000Z'),
      etag: 'etag-1',
    });

    await controller.getShopMedia('test-shop', 'logo', 'logo.jpg', res);

    expect(storageService.getObjectStream).toHaveBeenCalledWith(
      'shops/shop-1/logo/logo.jpg',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=31536000, immutable',
    );
    expect(res.setHeader).toHaveBeenCalledWith('ETag', 'etag-1');
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });

  it('should throw NotFoundException when shop inactive', async () => {
    const res = createMock<Response>();
    shopService.findBySlug.mockResolvedValue({ ...mockShop, isActive: false });

    await expect(
      controller.getShopMedia('test-shop', 'logo', 'logo.jpg', res),
    ).rejects.toThrow(NotFoundException);
  });
});
