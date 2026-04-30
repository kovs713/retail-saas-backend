import { Role } from '@/common/enums';

import {
  CHAT_EVENT_QUERIES,
  SEED_LOCALE,
  SHOP_SEEDS,
  buildSeedUsers,
} from './fake-data.seed-data';

describe('fake-data seed data', () => {
  it('uses Russian faker locale', () => {
    expect(SEED_LOCALE).toBe('ru');
  });

  it('defines two niche shops for the demo catalog', () => {
    expect(SHOP_SEEDS).toHaveLength(2);

    expect(SHOP_SEEDS.filter((shop) => shop.slug.includes('zoo'))).toHaveLength(
      1,
    );
    expect(
      SHOP_SEEDS.filter((shop) => shop.slug.includes('ogorod')),
    ).toHaveLength(1);
  });

  it('keeps storefront-facing data in Russian', () => {
    for (const shop of SHOP_SEEDS) {
      expect(shop.name).toMatch(/^[^A-Za-z]+$/);
      expect(shop.description).toMatch(/[А-Яа-яЁё]/);
      expect(shop.address).toMatch(/[А-Яа-яЁё]/);

      for (const category of shop.categories) {
        expect(category.name).toMatch(/[А-Яа-яЁё]/);
      }

      for (const product of shop.products) {
        expect(product.name).toMatch(/[А-Яа-яЁё]/);
        expect(product.description).toMatch(/[А-Яа-яЁё]/);
        expect(product.metadata.brand).toMatch(/[А-Яа-яЁё]/);
        expect(product.metadata.unit).toMatch(/[А-Яа-яЁё]/);
      }
    }

    for (const query of CHAT_EVENT_QUERIES) {
      expect(query).toMatch(/[А-Яа-яЁё]/);
    }
  });

  it('builds owner and employee accounts for every seeded shop', () => {
    const users = buildSeedUsers();
    const owners = users.filter((user) => user.role === Role.OWNER);
    const employees = users.filter((user) => user.role === Role.EMPLOYEE);
    const admins = users.filter((user) => user.role === Role.ADMIN);

    expect(owners).toHaveLength(2);
    expect(employees).toHaveLength(2);
    expect(admins).toHaveLength(1);
    expect(admins[0]).toMatchObject({
      email: 'admin@retail-saas.com',
      shopSeedIndex: null,
    });

    expect(owners.map((user) => user.email)).toEqual([
      'owner@zoo-lapki-hvost.ru',
      'owner@ogorod-sezon.ru',
    ]);
    expect(employees.map((user) => user.email)).toEqual([
      'manager@zoo-lapki-hvost.ru',
      'manager@ogorod-sezon.ru',
    ]);
  });
});
