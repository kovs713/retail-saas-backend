import {
  createAdminUser,
  createManagerUser,
  createOwnerUser,
  createUser,
  createUsers,
} from '@/core/database/factories';

describe('UserFactory', () => {
  describe('createUser', () => {
    it('should create a user with default values', () => {
      const user = createUser();

      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe('');
      expect(user.role).toBe('owner');
      expect(user.isActive).toBe(true);
      expect(user.shopId).toBeNull();
    });

    it('should create a user with custom options', () => {
      const user = createUser({
        email: 'custom@example.com',
        passwordHash: 'hashed-password',
        role: 'manager',
        shopId: 'shop-123',
        isActive: false,
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.passwordHash).toBe('hashed-password');
      expect(user.role).toBe('manager');
      expect(user.shopId).toBe('shop-123');
      expect(user.isActive).toBe(false);
    });
  });

  describe('createUsers', () => {
    it('should create multiple users with same options', () => {
      const users = createUsers(3, { role: 'manager' });

      expect(users).toHaveLength(3);
      expect(users[0].role).toBe('manager');
      expect(users[1].role).toBe('manager');
      expect(users[2].role).toBe('manager');
    });
  });

  describe('createOwnerUser', () => {
    it('should create an owner user with shop', () => {
      const user = createOwnerUser('shop-123', 'hashed-password');

      expect(user.email).toBe('owner@example.com');
      expect(user.passwordHash).toBe('hashed-password');
      expect(user.role).toBe('owner');
      expect(user.shopId).toBe('shop-123');
    });

    it('should create an owner user with custom email', () => {
      const user = createOwnerUser('shop-123', 'hashed-password', 'custom-owner@example.com');

      expect(user.email).toBe('custom-owner@example.com');
    });
  });

  describe('createManagerUser', () => {
    it('should create a manager user with shop', () => {
      const user = createManagerUser('shop-123', 'hashed-password');

      expect(user.email).toBe('manager@example.com');
      expect(user.passwordHash).toBe('hashed-password');
      expect(user.role).toBe('manager');
      expect(user.shopId).toBe('shop-123');
    });

    it('should create a manager user with custom email', () => {
      const user = createManagerUser('shop-123', 'hashed-password', 'custom-manager@example.com');

      expect(user.email).toBe('custom-manager@example.com');
    });
  });

  describe('createAdminUser', () => {
    it('should create an admin user without shop', () => {
      const user = createAdminUser('hashed-password');

      expect(user.email).toBe('admin@retail.com');
      expect(user.passwordHash).toBe('hashed-password');
      expect(user.role).toBe('admin');
      expect(user.shopId).toBeNull();
    });
  });
});
