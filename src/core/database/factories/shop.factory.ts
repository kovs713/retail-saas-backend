import { Shop } from '@/modules/shop/entities';

export interface CreateShopOptions {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  isActive?: boolean;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  workingHours?: Record<string, string> | null;
  ownerId?: string | null;
  createdAt?: Date;
}

export function createShop(options: CreateShopOptions = {}): Partial<Shop> {
  return {
    name: options.name || 'Test Shop',
    slug: options.slug || 'test-shop',
    description: options.description || 'A test shop description',
    address: '123 Test Street',
    phone: '+1234567890',
    isActive: true,
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
    ...(options.ownerId && { ownerId: options.ownerId }),
  };
}

export function createShopEntity(options: CreateShopOptions = {}): Shop {
  const now = new Date();

  return {
    id: options.id ?? 'shop_001',
    name: options.name || 'Test Shop',
    slug: options.slug || 'test-shop',
    description: options.description ?? null,
    address: options.address ?? null,
    phone: options.phone ?? null,
    workingHours: options.workingHours ?? null,
    logoUrl: options.logoUrl ?? null,
    bannerUrl: options.bannerUrl ?? null,
    isActive: options.isActive ?? true,
    ownerId: options.ownerId ?? null,
    owner: null as unknown as Shop['owner'],
    chatEvents: [],
    storefrontViews: [],
    orders: [],
    createdAt: options.createdAt ?? now,
  };
}

export function createShops(count: number): Partial<Shop>[] {
  return Array.from({ length: count }, () => createShop());
}
