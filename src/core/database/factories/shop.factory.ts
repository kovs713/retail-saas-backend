import { Shop } from '@/modules/shop/entities';
import { generateId, generateUniqueName } from './shared.utils';

type ShopOverrides = Partial<Shop> & { index?: number };

export function createShop(overrides: ShopOverrides = {}): Shop {
  const { index = 1, ...fields } = overrides;
  return {
    id: generateId('shop', index),
    name: generateUniqueName('Test Shop', index),
    slug: `test-shop-${String(index).padStart(3, '0')}`,
    description: null,
    address: null,
    phone: null,
    workingHours: null,
    logoUrl: null,
    bannerUrl: null,
    isActive: true,
    ownerId: null,
    chatEvents: [],
    storefrontViews: [],
    orders: [],
    createdAt: new Date(),
    ...fields,
  } as Shop;
}

export function createShops(count: number, overrides: Omit<ShopOverrides, 'index'> = {}): Shop[] {
  return Array.from({ length: count }, (_, i) => createShop({ ...overrides, index: i + 1 }));
}
