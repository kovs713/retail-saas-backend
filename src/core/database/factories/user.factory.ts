import { TokenPayload } from '@/common/types';
import { User } from '@/modules/user/entities';

export type UserRole = 'owner' | 'manager' | 'admin';

export interface CreateUserOptions {
  email?: string;
  passwordHash?: string;
  role?: UserRole;
  shopId?: string | null;
  isActive?: boolean;
}

export interface CreateTokenPayloadOptions {
  sub?: string;
  email?: string;
  shopId?: string;
  role?: string;
}

export interface CreateAuthResponseOptions {
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  role?: string;
  shopId?: string | null;
  isActive?: boolean;
}

export function createUser(options: CreateUserOptions = {}): Partial<User> {
  return {
    email: options.email || 'test@example.com',
    passwordHash: options.passwordHash || '',
    role: options.role || 'owner',
    isActive: options.isActive ?? true,
    shopId: options.shopId ?? null,
  };
}

export function createUserEntity(options: CreateUserOptions & { id?: string } = {}): User {
  const now = new Date();
  return {
    id: options.id ?? 'user_001',
    email: options.email || 'test@example.com',
    passwordHash: options.passwordHash || 'hashed-password',
    role: options.role || 'owner',
    isActive: options.isActive ?? true,
    shopId: options.shopId ?? null,
    shop: null as any,
    createdAt: now,
    updatedAt: now,
  } as User;
}

export function createUsers(count: number, options: CreateUserOptions = {}): Partial<User>[] {
  return Array.from({ length: count }, () => createUser(options));
}

export function createOwnerUser(shopId: string, passwordHash: string, email?: string): Partial<User> {
  return createUser({
    email: email || 'owner@example.com',
    passwordHash,
    role: 'owner',
    shopId,
  });
}

export function createManagerUser(shopId: string, passwordHash: string, email?: string): Partial<User> {
  return createUser({
    email: email || 'manager@example.com',
    passwordHash,
    role: 'manager',
    shopId,
  });
}

export function createAdminUser(passwordHash: string): Partial<User> {
  return createUser({
    email: 'admin@retail.com',
    passwordHash,
    role: 'admin',
    shopId: null,
  });
}

export function createTokenPayload(options: CreateTokenPayloadOptions = {}): TokenPayload {
  return {
    sub: options.sub ?? 'user_001',
    email: options.email ?? 'test@example.com',
    shopId: options.shopId ?? 'shop_001',
    role: options.role ?? 'owner',
  };
}

export function createAuthResponseDto(options: CreateAuthResponseOptions = {}) {
  return {
    email: options.email ?? 'test@example.com',
    accessToken: options.accessToken ?? 'mock-access-token',
    refreshToken: options.refreshToken ?? 'mock-refresh-token',
    user: {
      id: options.userId ?? 'user_001',
      email: options.email ?? 'test@example.com',
      role: options.role ?? 'owner',
      shopId: options.shopId ?? 'shop_001',
      isActive: options.isActive ?? true,
    },
  };
}
