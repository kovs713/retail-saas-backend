import { Category } from '@/modules/product/entities';

import { Faker, en } from '@faker-js/faker';

const faker = new Faker({ locale: [en] });

export interface CreateCategoryOptions {
  name?: string;
  slug?: string;
  shopId?: string;
}

export function createCategory(options: CreateCategoryOptions = {}): Partial<Category> {
  const name = options.name || faker.commerce.department();

  return {
    name,
    slug: options.slug || faker.helpers.slugify(name).toLowerCase(),
    shopId: options.shopId || '',
  };
}

export function createCategories(count: number, shopId: string): Partial<Category>[] {
  return Array.from({ length: count }, (_, index) =>
    createCategory({
      name: `Category ${index + 1}`,
      shopId,
    }),
  );
}

export function createNamedCategories(names: { name: string; slug?: string }[], shopId: string): Partial<Category>[] {
  return names.map((item) =>
    createCategory({
      name: item.name,
      slug: item.slug || faker.helpers.slugify(item.name).toLowerCase(),
      shopId,
    }),
  );
}
