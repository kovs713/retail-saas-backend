import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { Shop } from '@/modules/shop/entities';
import { ShopRepository } from '@/modules/shop/repository';
import { ShopService } from '@/modules/shop/shop.service';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('ShopService Integration', () => {
  let app: INestApplication;
  let shopService: ShopService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const connection = getPostgresConnection();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
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
        TypeOrmModule.forFeature([Shop, User, ChatEvent, StorefrontView, Order]),
      ],
      providers: [
        ShopService,
        ShopRepository,
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    shopService = moduleFixture.get<ShopService>(ShopService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
  }, 120000);

  afterEach(async () => {
    await dataSource.query('UPDATE shops SET "ownerId" = NULL');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM shops');
  });

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('create', () => {
    it('should create a shop successfully', async () => {
      const result = await shopService.create({
        name: 'Test Shop',
        slug: 'test-shop',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Shop');
      expect(result.slug).toBe('test-shop');
      expect(result.isActive).toBe(true);
    });

    it('should throw ConflictException for duplicate slug', async () => {
      await shopService.create({ name: 'Test Shop', slug: 'duplicate-slug' });

      await expect(shopService.create({ name: 'Another Shop', slug: 'duplicate-slug' })).rejects.toThrow(
        'Shop with this slug already exists',
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a shop by slug', async () => {
      await shopService.create({ name: 'Find By Slug Shop', slug: 'find-by-slug' });

      const result = await shopService.findBySlug('find-by-slug');

      expect(result.name).toBe('Find By Slug Shop');
      expect(result.slug).toBe('find-by-slug');
    });

    it('should throw NotFoundException when shop not found', async () => {
      await expect(shopService.findBySlug('non-existent')).rejects.toThrow('Shop not found');
    });
  });

  describe('findById', () => {
    it('should return a shop by id', async () => {
      const created = await shopService.create({ name: 'Find By ID Shop', slug: 'find-by-id' });

      const result = await shopService.findById(created.id);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Find By ID Shop');
    });

    it('should throw NotFoundException when shop not found', async () => {
      await expect(shopService.findById('00000000-0000-0000-0000-000000000000')).rejects.toThrow('Shop not found');
    });
  });

  describe('findByOwnerId', () => {
    it('should return a shop by owner id', async () => {
      const user = dataSource.getRepository(User).create({
        email: 'owner@example.com',
        passwordHash: 'hash',
        role: 'owner',
        shopId: null,
      });
      const savedUser = await dataSource.getRepository(User).save(user);

      await shopService.create({ name: 'Find By Owner Shop', slug: 'find-by-owner', ownerId: savedUser.id });

      const result = await shopService.findByOwnerId(savedUser.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Find By Owner Shop');
    });

    it('should return null when shop not found', async () => {
      const user = dataSource.getRepository(User).create({
        email: 'no-owner@example.com',
        passwordHash: 'hash',
        role: 'owner',
        shopId: null,
      });
      const savedUser = await dataSource.getRepository(User).save(user);

      const result = await shopService.findByOwnerId(savedUser.id);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a shop successfully', async () => {
      const created = await shopService.create({ name: 'Update Shop', slug: 'update-shop' });

      const result = await shopService.update(created.id, {
        name: 'Updated Shop',
        description: 'Updated description',
      });

      expect(result.name).toBe('Updated Shop');
      expect(result.description).toBe('Updated description');
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      await expect(
        shopService.update('00000000-0000-0000-0000-000000000000', { name: 'Updated Shop' }),
      ).rejects.toThrow('Shop not found');
    });
  });

  describe('updateOwner', () => {
    it('should update shop owner successfully', async () => {
      const user = dataSource.getRepository(User).create({
        email: 'new-owner@example.com',
        passwordHash: 'hash',
        role: 'owner',
        shopId: null,
      });
      const savedUser = await dataSource.getRepository(User).save(user);

      const created = await shopService.create({ name: 'Update Owner Shop', slug: 'update-owner-shop' });

      const result = await shopService.updateOwner(created.id, savedUser.id);

      expect(result.ownerId).toBe(savedUser.id);
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      const user = dataSource.getRepository(User).create({
        email: 'test-owner@example.com',
        passwordHash: 'hash',
        role: 'owner',
        shopId: null,
      });
      const savedUser = await dataSource.getRepository(User).save(user);

      await expect(shopService.updateOwner('00000000-0000-0000-0000-000000000000', savedUser.id)).rejects.toThrow(
        'Shop not found',
      );
    });
  });

  describe('updateMediaUrls', () => {
    it('should update logo URL only', async () => {
      const created = await shopService.create({ name: 'Media Shop', slug: 'media-shop' });

      const result = await shopService.updateMediaUrls(created.id, 'https://example.com/logo.png');

      expect(result.logoUrl).toBe('https://example.com/logo.png');
      expect(result.bannerUrl).toBeNull();
    });

    it('should update banner URL only', async () => {
      const created = await shopService.create({ name: 'Media Shop', slug: 'media-shop-2' });

      const result = await shopService.updateMediaUrls(created.id, undefined, 'https://example.com/banner.png');

      expect(result.logoUrl).toBeNull();
      expect(result.bannerUrl).toBe('https://example.com/banner.png');
    });

    it('should update both logo and banner URLs', async () => {
      const created = await shopService.create({ name: 'Media Shop', slug: 'media-shop-3' });

      const result = await shopService.updateMediaUrls(
        created.id,
        'https://example.com/logo.png',
        'https://example.com/banner.png',
      );

      expect(result.logoUrl).toBe('https://example.com/logo.png');
      expect(result.bannerUrl).toBe('https://example.com/banner.png');
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      await expect(
        shopService.updateMediaUrls('00000000-0000-0000-0000-000000000000', 'https://example.com/logo.png'),
      ).rejects.toThrow('Shop not found');
    });
  });

  describe('toggleActive', () => {
    it('should toggle shop from active to inactive', async () => {
      const created = await shopService.create({ name: 'Toggle Shop', slug: 'toggle-shop' });
      expect(created.isActive).toBe(true);

      const result = await shopService.toggleActive(created.id);

      expect(result.isActive).toBe(false);
    });

    it('should toggle shop from inactive to active', async () => {
      const created = await shopService.create({ name: 'Toggle Shop 2', slug: 'toggle-shop-2' });

      await shopService.toggleActive(created.id);
      const result = await shopService.toggleActive(created.id);

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException for non-existent shop', async () => {
      await expect(shopService.toggleActive('00000000-0000-0000-0000-000000000000')).rejects.toThrow('Shop not found');
    });
  });
});
