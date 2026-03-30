import { Shop } from '@/modules/shop/entities';

import { Faker, en } from '@faker-js/faker';

const faker = new Faker({ locale: [en] });

export interface CreateShopOptions {
  name?: string;
  slug?: string;
  description?: string;
  ownerId?: string;
}

export function createShop(options: CreateShopOptions = {}): Partial<Shop> {
  return {
    name: options.name || `${faker.company.name()} Store`,
    slug: options.slug || faker.helpers.slugify(`${faker.company.name()}-store`).toLowerCase(),
    description: options.description || faker.company.catchPhrase(),
    address: faker.location.streetAddress(),
    phone: faker.phone.number(),
    isActive: true,
    logoUrl: faker.image.dataUri({ width: 200, height: 200 }),
    bannerUrl: faker.image.dataUri({ width: 1200, height: 400 }),
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
