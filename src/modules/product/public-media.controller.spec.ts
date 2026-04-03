import { StorageService } from '@/modules/storage/storage.service';
import { Product } from './entities';
import { ProductService } from './product.service';
import { PublicMediaController } from './public-media.controller';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Readable } from 'stream';

describe('PublicMediaController', () => {
  let controller: PublicMediaController;
  let productService: DeepMocked<ProductService>;
  let storageService: DeepMocked<StorageService>;

  beforeEach(async () => {
    productService = createMock<DeepMocked<ProductService>>();
    storageService = createMock<DeepMocked<StorageService>>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicMediaController],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: StorageService, useValue: storageService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PublicMediaController);
  });

  const req = { ip: '127.0.0.1' } as Request;

  it('should stream image with headers', async () => {
    const res = createMock<Response>();
    const product = { id: 'p1' } as Product;
    const stream = new Readable({ read() {} });
    jest.spyOn(stream, 'pipe').mockReturnValue(res as any);
    storageService.getObjectStream.mockResolvedValue(stream);
    productService.findPublicByShopSlugAndId.mockResolvedValue(product);
    productService.buildProductImageObjectKey.mockReturnValue('products/p1/images/a.jpg');

    await controller.getProductImage('shop-1', 'p1', 'a.jpg', req, res);

    expect(storageService.getObjectStream).toHaveBeenCalledWith('products/p1/images/a.jpg');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });

  it('should throw NotFoundException when product missing', async () => {
    const res = createMock<Response>();
    productService.findPublicByShopSlugAndId.mockResolvedValue(null);

    await expect(controller.getProductImage('shop-1', 'p1', 'a.jpg', req, res)).rejects.toThrow(NotFoundException);
  });
});
