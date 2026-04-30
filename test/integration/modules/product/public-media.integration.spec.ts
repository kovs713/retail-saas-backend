import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { EvotorApiService } from '@/modules/evotor/evotor-api.service';
import { Order } from '@/modules/order/entities';
import { Category, Product } from '@/modules/product/entities';
import { ProductService } from '@/modules/product/product.service';
import { PublicMediaController } from '@/modules/product/public-media.controller';
import { CatalogIndexService } from '@/modules/product/catalog-index.service';
import {
  CategoryRepository,
  ProductRepository,
} from '@/modules/product/repositories';
import { Location, Shop } from '@/modules/shop/entities';
import { StorageService } from '@/modules/storage/storage.service';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Readable } from 'stream';
import request from 'supertest';
import { DataSource } from 'typeorm';

describe('PublicMedia Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let storageService: DeepMocked<StorageService>;
  let shopSlug: string;
  let productId: string;

  beforeAll(async () => {
    const connection = getPostgresConnection();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.password,
          database: connection.database,
          autoLoadEntities: true,
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          Shop,
          Location,
          User,
          Product,
          Category,
          ChatEvent,
          StorefrontView,
          Order,
        ]),
      ],
      controllers: [PublicMediaController],
      providers: [
        ProductService,
        ProductRepository,
        CategoryRepository,
        { provide: CacheService, useValue: mockCacheService() },
        { provide: StorageService, useValue: createMock<StorageService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
        { provide: EvotorApiService, useValue: createMock<EvotorApiService>() },
        {
          provide: CatalogIndexService,
          useValue: createMock<CatalogIndexService>(),
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    storageService =
      moduleFixture.get<DeepMocked<StorageService>>(StorageService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
  }, 120000);

  beforeEach(async () => {
    const shop = await dataSource.getRepository(Shop).save({
      name: 'Media Shop',
      slug: `media-shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isActive: true,
    });
    shopSlug = shop.slug;

    const product = await dataSource.getRepository(Product).save({
      sku: `SKU-${Date.now()}`,
      name: 'Media Product',
      price: 100,
      quantity: 10,
      shopId: shop.id,
    });
    productId = product.id;

    storageService.statObject.mockResolvedValue({
      size: 11,
      contentType: 'image/jpeg',
      lastModified: new Date('2025-01-01T00:00:00.000Z'),
      etag: 'etag-1',
    });
    const stream = new Readable({ read() {} });
    stream.push(Buffer.from('hello image'));
    stream.push(null);
    storageService.getObjectStream.mockResolvedValue(stream);
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM products');
      await dataSource.query('DELETE FROM categories');
      await dataSource.query('DELETE FROM shops');
    }
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should stream public image', async () => {
    const response = await request(app.getHttpServer()).get(
      `/public/media/${shopSlug}/products/${productId}/photo.jpg`,
    );

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/image/);
  });
});
