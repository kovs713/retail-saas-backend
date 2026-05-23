import { mockCacheService } from '@/common/utils';
import { RegistrationStatus } from '@/common/enums';
import { CacheService } from '@/core/cache/cache.service';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import {
  EvotorApplication,
  EvotorIntegration,
} from '@/modules/evotor/entities';
import { EvotorApplicationRepository } from '@/modules/evotor/repositories';
import { Order } from '@/modules/order/entities';
import { Category, Product, ProductImage } from '@/modules/product/entities';
import { ChatMessage, ChatSession } from '@/modules/rag/chat/entities';
import { ChatSessionRepository } from '@/modules/rag/chat/repositories';
import { RegistrationApplication } from '@/modules/registration-application/entities';
import { Location, Shop } from '@/modules/shop/entities';
import {
  LocationRepository,
  ShopRepository,
} from '@/modules/shop/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import { User } from '@/modules/user/entities';
import { UserRepository } from '@/modules/user/repositories';
import { UserService } from '@/modules/user/user.service';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('UserService Integration', () => {
  let app: INestApplication;
  let userService: UserService;
  let dataSource: DataSource;
  let shopId: string;

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
        TypeOrmModule.forFeature([
          Shop,
          Location,
          User,
          ChatEvent,
          StorefrontView,
          Order,
          ChatSession,
          ChatMessage,
          EvotorApplication,
          EvotorIntegration,
          Category,
          Product,
          ProductImage,
          RegistrationApplication,
        ]),
      ],
      providers: [
        UserService,
        UserRepository,
        ChatSessionRepository,
        EvotorApplicationRepository,
        ShopService,
        ShopRepository,
        LocationRepository,
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userService = moduleFixture.get<UserService>(UserService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
  }, 120000);

  beforeEach(async () => {
    const shop = dataSource.getRepository(Shop).create({
      name: 'Integration Test Shop',
      slug: `integration-shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    });
    const savedShop = await dataSource.getRepository(Shop).save(shop);
    shopId = savedShop.id;
  });

  afterEach(async () => {
    if (!dataSource?.isInitialized) {
      return;
    }
    await dataSource.query('DELETE FROM chat_messages');
    await dataSource.query('DELETE FROM chat_sessions');
    await dataSource.query('DELETE FROM evotor_applications');
    await dataSource.query('DELETE FROM evotor_integrations');
    await dataSource.query('DELETE FROM product_images');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM locations');
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM chat_events');
    await dataSource.query('DELETE FROM storefront_views');
    await dataSource.query('DELETE FROM registration_applications');
    await dataSource.query('UPDATE shops SET "ownerId" = NULL');
    await dataSource.query('UPDATE users SET "shopId" = NULL');
    await dataSource.query('DELETE FROM shops');
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const result = await userService.create({
        email: 'test@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('member');
      expect(result.shopId).toBe(shopId);
      expect(result.passwordHash).not.toBe('password123');
    });

    it('should use default role "owner" when not provided', async () => {
      const result = await userService.create({
        email: 'test-owner@example.com',
        password: 'password123',
        shopId,
      });

      expect(result.role).toBe('owner');
    });

    it('should throw ConflictException for duplicate email', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        role: 'member' as const,
        shopId,
      };

      await userService.create(dto);

      await expect(userService.create(dto)).rejects.toThrow(
        'User with email "test@example.com" already exists',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      await userService.create({
        email: 'findme@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      const result = await userService.findByEmail('findme@example.com');

      expect(result.email).toBe('findme@example.com');
    });

    it('should throw NotFoundException for non-existent email', async () => {
      await expect(
        userService.findByEmail('nonexistent@example.com'),
      ).rejects.toThrow('User with email "nonexistent@example.com" not found');
    });
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      const created = await userService.create({
        email: 'findbyid@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      const result = await userService.findById(created.id);

      expect(result.id).toBe(created.id);
      expect(result.email).toBe('findbyid@example.com');
    });

    it('should throw NotFoundException for invalid ID', async () => {
      await expect(
        userService.findById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(
        'User with ID "00000000-0000-0000-0000-000000000000" not found',
      );
    });
  });

  describe('findByShop', () => {
    it('should return all users in shop', async () => {
      await userService.create({
        email: 'user1@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });
      await userService.create({
        email: 'user2@example.com',
        password: 'password123',
        role: 'admin',
        shopId,
      });

      const result = await userService.findByShop(shopId);

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.shopId)).toContain(shopId);
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const created = await userService.create({
        email: 'updaterole@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      const result = await userService.updateRole(created.id, 'admin');

      expect(result.role).toBe('admin');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        userService.updateRole('00000000-0000-0000-0000-000000000000', 'admin'),
      ).rejects.toThrow(
        'User with ID "00000000-0000-0000-0000-000000000000" not found',
      );
    });
  });

  describe('deactivate/activate', () => {
    it('should deactivate user', async () => {
      const created = await userService.create({
        email: 'deactivate@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });
      expect(created.isActive).toBe(true);

      const deactivated = await userService.deactivate(created.id);
      expect(deactivated.isActive).toBe(false);
    });

    it('should activate user', async () => {
      const created = await userService.create({
        email: 'activate@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      await userService.deactivate(created.id);

      const activated = await userService.activate(created.id);
      expect(activated.isActive).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      const user = await userService.create({
        email: 'validate@example.com',
        password: 'correct-password',
        role: 'member',
        shopId,
      });

      const result = await userService.validatePassword(
        user,
        'correct-password',
      );

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = await userService.create({
        email: 'validate2@example.com',
        password: 'correct-password',
        role: 'member',
        shopId,
      });

      const result = await userService.validatePassword(user, 'wrong-password');

      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user email', async () => {
      const created = await userService.create({
        email: 'old@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      const result = await userService.update(created.id, {
        email: 'new@example.com',
      });

      expect(result.email).toBe('new@example.com');
    });

    it('should throw ConflictException for duplicate email', async () => {
      await userService.create({
        email: 'existing@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      const user2 = await userService.create({
        email: 'user2@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      await expect(
        userService.update(user2.id, { email: 'existing@example.com' }),
      ).rejects.toThrow(
        'User with email "existing@example.com" already exists',
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        userService.update('00000000-0000-0000-0000-000000000000', {
          email: 'new@example.com',
        }),
      ).rejects.toThrow(
        'User with ID "00000000-0000-0000-0000-000000000000" not found',
      );
    });
  });

  describe('hardDelete', () => {
    it('should delete owned shop and tenant data', async () => {
      const owner = await userService.create({
        email: 'owner-delete@example.com',
        password: 'password123',
        role: 'owner',
        shopId,
      });
      const member = await userService.create({
        email: 'member-delete@example.com',
        password: 'password123',
        role: 'member',
        shopId,
      });

      await dataSource
        .getRepository(Shop)
        .update(shopId, { ownerId: owner.id });

      const category = await dataSource.getRepository(Category).save({
        shopId,
        name: 'Delete Category',
        slug: 'delete-category',
      });
      const product = await dataSource.getRepository(Product).save({
        shopId,
        sku: 'DELETE-SKU',
        name: 'Delete Product',
        categoryId: category.id,
      });
      await dataSource.getRepository(ProductImage).save({
        shopId,
        productId: product.id,
        s3Key: 'shops/delete/product.jpg',
        publicUrl: '/media/product.jpg',
        contentType: 'image/jpeg',
        size: 100,
      });
      await dataSource.getRepository(Location).save({
        shopId,
        name: 'Delete Location',
      });
      const session = await dataSource.getRepository(ChatSession).save({
        shopId,
        userId: owner.id,
        lastMessageAt: new Date(),
      });
      await dataSource.getRepository(ChatMessage).save({
        sessionId: session.id,
        role: 'user',
        content: 'hello',
      });
      await dataSource.getRepository(EvotorApplication).save({
        userId: owner.id,
        shopId,
        evotorUserId: 'evotor-delete-user',
        status: RegistrationStatus.PENDING,
      });
      await dataSource.getRepository(EvotorIntegration).save({
        shopId,
        externalStoreId: 'evotor-delete-store',
      });
      await dataSource.getRepository(Order).save({
        shopId,
        customerName: 'Customer',
        customerPhone: '+70000000000',
        items: [{ productId: product.id, quantity: 1, price: 100 }],
        totalAmount: 100,
      });
      await dataSource.getRepository(ChatEvent).save({
        shopId,
        userQuery: 'hello',
        answerLength: 5,
        sourcesCount: 1,
      });
      await dataSource.getRepository(StorefrontView).save({ shopId });
      await dataSource.getRepository(RegistrationApplication).save({
        email: owner.email,
        passwordHash: 'hash',
        shopName: 'Integration Test Shop',
        shopSlug: `deleted-${shopId}`,
        status: RegistrationStatus.APPROVED,
        approvedShopId: shopId,
        approvedUserId: owner.id,
      });

      await userService.hardDelete(owner.id);

      await expect(userService.findById(owner.id)).rejects.toThrow(
        `User with ID "${owner.id}" not found`,
      );
      await expect(userService.findById(member.id)).rejects.toThrow(
        `User with ID "${member.id}" not found`,
      );
      await expect(
        dataSource.getRepository(Shop).findOneBy({ id: shopId }),
      ).resolves.toBeNull();
      await expect(dataSource.getRepository(Product).count()).resolves.toBe(0);
      await expect(
        dataSource.getRepository(ProductImage).count(),
      ).resolves.toBe(0);
      await expect(dataSource.getRepository(Category).count()).resolves.toBe(0);
      await expect(dataSource.getRepository(Location).count()).resolves.toBe(0);
      await expect(dataSource.getRepository(ChatSession).count()).resolves.toBe(
        0,
      );
      await expect(dataSource.getRepository(ChatMessage).count()).resolves.toBe(
        0,
      );
      await expect(
        dataSource.getRepository(EvotorApplication).count(),
      ).resolves.toBe(0);
      await expect(
        dataSource.getRepository(EvotorIntegration).count(),
      ).resolves.toBe(0);
      await expect(dataSource.getRepository(Order).count()).resolves.toBe(0);
      await expect(dataSource.getRepository(ChatEvent).count()).resolves.toBe(
        0,
      );
      await expect(
        dataSource.getRepository(StorefrontView).count(),
      ).resolves.toBe(0);
      await expect(
        dataSource.getRepository(RegistrationApplication).count(),
      ).resolves.toBe(0);
    });
  });

  describe('cross-tenant isolation', () => {
    let shopA: string;
    let shopB: string;

    beforeEach(async () => {
      const shopRepo = dataSource.getRepository(Shop);
      const a = await shopRepo.save(
        shopRepo.create({ name: 'Shop A', slug: `shop-a-${Date.now()}` }),
      );
      const b = await shopRepo.save(
        shopRepo.create({ name: 'Shop B', slug: `shop-b-${Date.now()}` }),
      );
      shopA = a.id;
      shopB = b.id;
    });

    it('should not allow user from shop A to see shop B users', async () => {
      await userService.create({
        email: 'user-a@example.com',
        password: 'password123',
        role: 'member',
        shopId: shopA,
      });
      await userService.create({
        email: 'user-b@example.com',
        password: 'password123',
        role: 'member',
        shopId: shopB,
      });

      const usersA = await userService.findByShop(shopA);
      const usersB = await userService.findByShop(shopB);

      expect(usersA.every((u) => u.shopId === shopA)).toBe(true);
      expect(usersB.every((u) => u.shopId === shopB)).toBe(true);
      expect(usersA.map((u) => u.email)).not.toContain('user-b@example.com');
    });

    it('should enforce global email uniqueness across shops', async () => {
      await userService.create({
        email: 'shared@example.com',
        password: 'password123',
        role: 'member',
        shopId: shopA,
      });

      await expect(
        userService.create({
          email: 'shared@example.com',
          password: 'password123',
          role: 'member',
          shopId: shopB,
        }),
      ).rejects.toThrow('already exists');
    });
  });
});
