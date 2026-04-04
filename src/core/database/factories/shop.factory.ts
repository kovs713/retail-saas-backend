import { Shop } from '@/modules/shop/entities';

import { generateId, generateUniqueName } from './shared.utils';

const DEFAULTS = {
  name: 'Test Shop',
  slug: 'test-shop',
  description: 'A test shop description',
  address: '123 Test Street',
  phone: '+1234567890',
  logoUrl:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TaG9wPC90ZXh0Pjwvc3ZnPg==',
  bannerUrl:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zz48cmVjdCB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNkZGQiLz48dGV4dCB4PSI2MDAiIHk9IjIwMCIgZm9udC1zaXplPSI0OCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QmFubmVyPC90ZXh0Pjwvc3ZnPg==',
  workingHours: {
    monday: '09:00-21:00',
    tuesday: '09:00-21:00',
    wednesday: '09:00-21:00',
    thursday: '09:00-21:00',
    friday: '09:00-21:00',
    saturday: '10:00-20:00',
    sunday: '10:00-18:00',
  },
};

interface ShopFactoryOptions {
  index?: number;
  overrides?: Partial<Shop>;
}

function buildShop(options: ShopFactoryOptions = {}): Shop {
  const { index = 1, overrides = {} } = options;
  const now = new Date();

  return {
    id: overrides.id ?? generateId('shop', index),
    name: overrides.name ?? generateUniqueName(DEFAULTS.name, index),
    slug: overrides.slug ?? `${DEFAULTS.slug}-${String(index).padStart(3, '0')}`,
    description: overrides.description ?? null,
    address: overrides.address ?? null,
    phone: overrides.phone ?? null,
    workingHours: overrides.workingHours ?? null,
    logoUrl: overrides.logoUrl ?? null,
    bannerUrl: overrides.bannerUrl ?? null,
    isActive: overrides.isActive ?? true,
    ownerId: overrides.ownerId ?? null,
    owner: (overrides.owner ?? null) as Shop['owner'],
    chatEvents: overrides.chatEvents ?? [],
    storefrontViews: overrides.storefrontViews ?? [],
    orders: overrides.orders ?? [],
    createdAt: overrides.createdAt ?? now,
  } as Shop;
}

export function createShop(options: ShopFactoryOptions = {}): Shop {
  return buildShop(options);
}

export function createShops(count: number, options: Omit<ShopFactoryOptions, 'index'> = {}): Shop[] {
  return Array.from({ length: count }, (_, i) => buildShop({ ...options, index: i + 1 }));
}

export function createShopEntity(options: ShopFactoryOptions = {}): Shop {
  return buildShop(options);
}
