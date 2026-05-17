import { ObjectStorageService } from '@/core/object-storage/object-storage.service';
import { Product } from './entities';
import { ProductService } from './product.service';
import { PublicMediaController } from './public-media.controller';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { Readable } from 'stream';

describe('PublicMediaController', () => {
  let controller: PublicMediaController;
  let productService: DeepMocked<ProductService>;
  let storageService: DeepMocked<ObjectStorageService>;

  beforeEach(async () => {
    productService = createMock<DeepMocked<ProductService>>();
    storageService = createMock<DeepMocked<ObjectStorageService>>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicMediaController],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: ObjectStorageService, useValue: storageService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PublicMediaController);
  });

  it('should stream image with headers', async () => {
    const res = createMock<Response>();
    const product = { id: 'p1' } as Product;
    const stream = new Readable({ read() {} });
    jest.spyOn(stream, 'pipe').mockReturnValue(res as any);
    storageService.getObjectStream.mockResolvedValue(stream);
    productService.findPublicByShopSlugAndId.mockResolvedValue(product);
    productService.buildProductImageKey.mockReturnValue(
      'products/p1/images/a.jpg',
    );
    storageService.statObject.mockResolvedValue({
      size: 11,
      contentType: 'image/jpeg',
      lastModified: new Date('2025-01-01T00:00:00.000Z'),
      etag: 'etag-1',
    });

    await controller.getProductImage('shop-1', 'p1', 'a.jpg', res);

    expect(storageService.getObjectStream).toHaveBeenCalledWith(
      'products/p1/images/a.jpg',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=31536000, immutable',
    );
    expect(res.setHeader).toHaveBeenCalledWith('ETag', 'etag-1');
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });

  it('should throw NotFoundException when product missing', async () => {
    const res = createMock<Response>();
    productService.findPublicByShopSlugAndId.mockResolvedValue(null);

    await expect(
      controller.getProductImage('shop-1', 'p1', 'a.jpg', res),
    ).rejects.toThrow(NotFoundException);
  });
});
