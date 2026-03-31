import { Shop } from '@/modules/shop/entities';

export interface CreateShopOptions {
  name?: string;
  slug?: string;
  description?: string;
  ownerId?: string;
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
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNjAwIiB5PSIyMDAiIGZvbnQtc2l6ZT0iNDgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJhbm5lcjwvdGV4dD48L3N2Zz4=',
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

export function createShops(count: number): Partial<Shop>[] {
  return Array.from({ length: count }, () => createShop());
}
