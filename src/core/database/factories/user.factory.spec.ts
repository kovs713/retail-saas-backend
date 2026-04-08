import { Role } from '@/common/enums';
import {
  createAdminUser,
  createAuthResponseDto,
  createEmployeeUser,
  createOwnerUser,
  createTokenPayload,
  createUser,
  createUsers,
} from './user.factory';

describe('user.factory', () => {
  describe('createUser', () => {
    it('should create user with default values', () => {
      const user = createUser();

      expect(user.id).toBe('user_001');
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe('hashed-password');
      expect(user.role).toBe(Role.OWNER);
      expect(user.isActive).toBe(true);
      expect(user.shopId).toBe('shop_001');
    });

    it('should create user with custom index', () => {
      const user = createUser({ index: 5 });

      expect(user.id).toBe('user_005');
      expect(user.shopId).toBe('shop_005');
    });

    it('should allow overriding default values', () => {
      const user = createUser({
        email: 'custom@example.com',
        role: Role.EMPLOYEE,
        isActive: false,
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.role).toBe(Role.EMPLOYEE);
      expect(user.isActive).toBe(false);
    });

    it('should allow overriding shopId independently', () => {
      const user = createUser({ shopId: 'custom-shop-id' });

      expect(user.shopId).toBe('custom-shop-id');
    });

    it('should create users with timestamps', () => {
      const user = createUser();

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should exclude index from resulting object', () => {
      const user = createUser({ index: 1 });

      expect('index' in user).toBe(false);
    });
  });

  describe('createUsers', () => {
    it('should create specified number of users', () => {
      const users = createUsers(3);

      expect(users).toHaveLength(3);
    });

    it('should create users with sequential indices', () => {
      const users = createUsers(3);

      expect(users[0].id).toBe('user_001');
      expect(users[1].id).toBe('user_002');
      expect(users[2].id).toBe('user_003');
    });

    it('should apply overrides to all users', () => {
      const users = createUsers(2, { role: Role.EMPLOYEE });

      expect(users[0].role).toBe(Role.EMPLOYEE);
      expect(users[1].role).toBe(Role.EMPLOYEE);
    });

    it('should generate unique shopIds for each user', () => {
      const users = createUsers(3);

      const shopIds = users.map((u) => u.shopId);
      expect(new Set(shopIds).size).toBe(3);
    });
  });

  describe('createOwnerUser', () => {
    it('should create user with OWNER role and specified shopId', () => {
      const user = createOwnerUser('shop_123');

      expect(user.role).toBe(Role.OWNER);
      expect(user.shopId).toBe('shop_123');
    });

    it('should allow additional overrides', () => {
      const user = createOwnerUser('shop_123', { email: 'owner@test.com' });

      expect(user.email).toBe('owner@test.com');
      expect(user.role).toBe(Role.OWNER);
      expect(user.shopId).toBe('shop_123');
    });
  });

  describe('createEmployeeUser', () => {
    it('should create user with EMPLOYEE role and specified shopId', () => {
      const user = createEmployeeUser('shop_456');

      expect(user.role).toBe(Role.EMPLOYEE);
      expect(user.shopId).toBe('shop_456');
    });
  });

  describe('createAdminUser', () => {
    it('should create user with ADMIN role and null shopId', () => {
      const user = createAdminUser();

      expect(user.role).toBe(Role.ADMIN);
      expect(user.shopId).toBeNull();
    });

    it('should allow overrides while maintaining admin role', () => {
      const user = createAdminUser({ email: 'admin@test.com' });

      expect(user.role).toBe(Role.ADMIN);
      expect(user.email).toBe('admin@test.com');
    });
  });

  describe('createTokenPayload', () => {
    it('should create token payload with default values', () => {
      const payload = createTokenPayload();

      expect(payload.sub).toBe('user_001');
      expect(payload.email).toBe('test@example.com');
      expect(payload.shopId).toBe('shop_001');
      expect(payload.role).toBe(Role.OWNER);
    });

    it('should allow overriding values', () => {
      const payload = createTokenPayload({
        sub: 'custom-user',
        role: Role.EMPLOYEE,
        shopId: 'custom-shop',
      });

      expect(payload.sub).toBe('custom-user');
      expect(payload.role).toBe(Role.EMPLOYEE);
      expect(payload.shopId).toBe('custom-shop');
    });
  });

  describe('createAuthResponseDto', () => {
    it('should create auth response with default values', () => {
      const authResponse = createAuthResponseDto();

      expect(authResponse.accessToken).toBe('mock-access-token');
      expect(authResponse.refreshToken).toBe('mock-refresh-token');
      expect(authResponse.user.id).toBe('user_001');
      expect(authResponse.user.email).toBe('test@example.com');
      expect(authResponse.user.role).toBe(Role.OWNER);
      expect(authResponse.user.shopId).toBe('shop_001');
      expect(authResponse.user.isActive).toBe(true);
    });

    it('should allow overriding email', () => {
      const authResponse = createAuthResponseDto({ email: 'custom@test.com' });

      expect(authResponse.user.email).toBe('custom@test.com');
    });

    it('should allow overriding tokens', () => {
      const authResponse = createAuthResponseDto({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      expect(authResponse.accessToken).toBe('new-access-token');
      expect(authResponse.refreshToken).toBe('new-refresh-token');
    });

    it('should allow overriding user id', () => {
      const authResponse = createAuthResponseDto({ userId: 'custom-user-id' });

      expect(authResponse.user.id).toBe('custom-user-id');
    });

    it('should allow overriding shopId', () => {
      const authResponse = createAuthResponseDto({ shopId: 'custom-shop' });

      expect(authResponse.user.shopId).toBe('custom-shop');
    });

    it('should allow overriding user role', () => {
      const authResponse = createAuthResponseDto({ role: Role.EMPLOYEE });

      expect(authResponse.user.role).toBe(Role.EMPLOYEE);
    });

    it('should allow overriding isActive status', () => {
      const authResponse = createAuthResponseDto({ isActive: false });

      expect(authResponse.user.isActive).toBe(false);
    });

    it('should return user object with expected structure', () => {
      const authResponse = createAuthResponseDto();

      expect(authResponse.user).toHaveProperty('id');
      expect(authResponse.user).toHaveProperty('email');
      expect(authResponse.user).toHaveProperty('role');
      expect(authResponse.user).toHaveProperty('shopId');
      expect(authResponse.user).toHaveProperty('isActive');
    });
  });
});
