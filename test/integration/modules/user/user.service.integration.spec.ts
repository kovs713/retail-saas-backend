import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { Shop } from '@/modules/shop/entities';
import { ShopRepository } from '@/modules/shop/repository';
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
        TypeOrmModule.forFeature([Shop, User]),
      ],
      providers: [
        UserService,
        UserRepository,
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
    await dataSource.query('UPDATE users SET "shopId" = NULL');
    await dataSource.query('DELETE FROM shops');
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    await app.close();
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
      const dto = { email: 'test@example.com', password: 'password123', role: 'member' as const, shopId };

      await userService.create(dto);

      await expect(userService.create(dto)).rejects.toThrow('User with email "test@example.com" already exists');
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      await userService.create({ email: 'findme@example.com', password: 'password123', role: 'member', shopId });

      const result = await userService.findByEmail('findme@example.com');

      expect(result.email).toBe('findme@example.com');
    });

    it('should throw NotFoundException for non-existent email', async () => {
      await expect(userService.findByEmail('nonexistent@example.com')).rejects.toThrow(
        'User with email "nonexistent@example.com" not found',
      );
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
      await expect(userService.findById('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        'User with ID "00000000-0000-0000-0000-000000000000" not found',
      );
    });
  });

  describe('findByShop', () => {
    it('should return all users in shop', async () => {
      await userService.create({ email: 'user1@example.com', password: 'password123', role: 'member', shopId });
      await userService.create({ email: 'user2@example.com', password: 'password123', role: 'admin', shopId });

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
      await expect(userService.updateRole('00000000-0000-0000-0000-000000000000', 'admin')).rejects.toThrow(
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

      const result = await userService.validatePassword(user, 'correct-password');

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

      const result = await userService.update(created.id, { email: 'new@example.com' });

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

      await expect(userService.update(user2.id, { email: 'existing@example.com' })).rejects.toThrow(
        'User with email "existing@example.com" already exists',
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        userService.update('00000000-0000-0000-0000-000000000000', { email: 'new@example.com' }),
      ).rejects.toThrow('User with ID "00000000-0000-0000-0000-000000000000" not found');
    });
  });
});
