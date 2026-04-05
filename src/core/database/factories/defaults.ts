import { generateId } from './shared.utils';

export const DEFAULT_IDS = {
  shopId: (index = 1) => generateId('shop', index),
  userId: (index = 1) => generateId('user', index),
  categoryId: (index = 1) => generateId('cat', index),
  orderId: (index = 1) => generateId('order', index),
};

export const DEFAULT_CONTACTS = {
  email: 'test@example.com',
  phone: '+1234567890',
  customerName: 'Test Customer',
};

export const DEFAULT_TOKENS = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  passwordHash: 'hashed-password',
};
