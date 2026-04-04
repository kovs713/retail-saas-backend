import { Category } from '@/modules/product/entities';

import { createShop } from './shop.factory';
import { generateId, generateUniqueName, generateUniqueSlug } from './shared.utils';

const DEFAULTS = {
  name: 'Test Category',
};

function defaultShopId(index: number): string {
  return createShop({ index }).id;
}

interface CategoryFactoryOptions {
  index?: number;
  overrides?: Partial<Category>;
}

function buildCategory(options: CategoryFactoryOptions = {}): Category {
  const { index = 1, overrides = {} } = options;
  const now = new Date();
  const name = overrides.name ?? DEFAULTS.name;

  return {
    id: overrides.id ?? generateId('cat', index),
    name,
    slug: overrides.slug ?? name.toLowerCase().replace(/\s+/g, '-'),
    shopId: overrides.shopId ?? defaultShopId(index),
    shop: (overrides.shop ?? null) as Category['shop'],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  } as Category;
}

export function createCategory(options: CategoryFactoryOptions = {}): Category {
  return buildCategory(options);
}

export function createCategoryEntity(options: CategoryFactoryOptions = {}): Category {
  return buildCategory(options);
}

export function createCategories(count: number, shopId: string): Category[] {
  return Array.from({ length: count }, (_, i) =>
    buildCategory({ index: i + 1, overrides: { name: generateUniqueName('Category', i + 1), shopId } }),
  );
}

export function createNamedCategories(names: { name: string; slug?: string }[], shopId: string): Category[] {
  return names.map((item, i) =>
    buildCategory({
      index: i + 1,
      overrides: {
        name: item.name,
        slug: item.slug ?? item.name.toLowerCase().replace(/\s+/g, '-'),
        shopId,
      },
    }),
  );
}
