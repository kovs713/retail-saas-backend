import { User } from '@/modules/user/entities';

export type UserRole = 'owner' | 'manager' | 'admin';

export interface CreateUserOptions {
  email?: string;
  passwordHash?: string;
  role?: UserRole;
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
