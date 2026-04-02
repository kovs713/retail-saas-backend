import { ProductService } from '@/modules/product/product.service';
import { PublicMediaController } from '@/modules/product/public-media.controller';
import { StorageService } from '@/modules/storage/storage.service';

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

describe('Public Media E2E (minimal)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [PublicMediaController],
      providers: [
        {
          provide: ProductService,
          useValue: {
            findPublicByShopSlugAndId: jest.fn(),
            buildProductImageObjectKey: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            statObject: jest.fn(),
            getObjectStream: jest.fn(),
            getPresignedPutUrl: jest.fn(),
            deleteObject: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should return 404 when product not found', async () => {
    const response = await request(app.getHttpServer()).get(
      '/public/media/shop/products/00000000-0000-0000-0000-000000000000/file.jpg',
    );

    expect(response.status).toBe(404);
  });
});
