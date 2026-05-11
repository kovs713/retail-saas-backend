import { Category } from '@/modules/product/entities';
import { DEFAULT_IDS } from './defaults';
import {
  createMany,
  generateId,
  generateUniqueName,
  generateUniqueSlug,
} from './shared.utils';

export function createCategory(
  overrides: Partial<Category> & { index?: number } = {},
): Category {
  const { index = 1, ...fields } = overrides;
  const name = overrides.name ?? generateUniqueName('Test Category', index);
  return {
    id: generateId('cat', index),
    shopId: DEFAULT_IDS.shopId(index),
    name,
    slug: generateUniqueSlug(name, index),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...fields,
  } as Category;
}

export function createCategories(
  count: number,
  overrides: Partial<Category> = {},
): Category[] {
  return createMany(count, (i) => createCategory({ ...overrides, index: i }));
}
