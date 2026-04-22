import { Role } from '@/common/enums';
import { TokenPayload } from '@/common/types';
import { User } from '@/modules/user/entities';
import { generateId } from './shared.utils';
import { createShop } from './shop.factory';

type UserOverrides = Partial<User> & { index?: number };

export function createUser(overrides: UserOverrides = {}): User {
  const { index = 1, ...fields } = overrides;
  const now = new Date();
  return {
    id: generateId('user', index),
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: Role.OWNER,
    isActive: true,
    shopId: createShop({ index }).id,
    shop: null,
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
}

export function createUsers(
  count: number,
  overrides: Omit<UserOverrides, 'index'> = {},
): User[] {
  return Array.from({ length: count }, (_, i) =>
    createUser({ ...overrides, index: i + 1 }),
  );
}

export function createOwnerUser(
  shopId: string,
  overrides: Partial<User> = {},
): User {
  return createUser({ ...overrides, role: Role.OWNER, shopId });
}

export function createEmployeeUser(
  shopId: string,
  overrides: Partial<User> = {},
): User {
  return createUser({ ...overrides, role: Role.EMPLOYEE, shopId });
}

export function createAdminUser(overrides: Partial<User> = {}): User {
  return createUser({ ...overrides, role: Role.ADMIN, shopId: null });
}

export function createTokenPayload(
  overrides: Partial<TokenPayload> = {},
): TokenPayload {
  return {
    sub: 'user_001',
    email: 'test@example.com',
    shopId: createShop({ index: 1 }).id,
    role: Role.OWNER,
    ...overrides,
  };
}

export function createAuthResponseDto(
  options: {
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
    role?: string;
    shopId?: string | null;
    isActive?: boolean;
  } = {},
) {
  const shopId = options.shopId ?? createShop({ index: 1 }).id;
  return {
    accessToken: options.accessToken ?? 'mock-access-token',
    refreshToken: options.refreshToken ?? 'mock-refresh-token',
    user: {
      id: options.userId ?? 'user_001',
      email: options.email ?? 'test@example.com',
      role: options.role ?? Role.OWNER,
      shopId,
      isActive: options.isActive ?? true,
    },
  };
}
