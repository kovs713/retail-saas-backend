import { Category } from '@/modules/product/entities';

export interface CreateCategoryOptions {
  name?: string;
  slug?: string;
  shopId?: string;
}

export function createCategory(options: CreateCategoryOptions = {}): Partial<Category> {
  const name = options.name || 'Test Category';

  return {
    name,
    slug: options.slug || name.toLowerCase().replace(/\s+/g, '-'),
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
      slug: item.slug || item.name.toLowerCase().replace(/\s+/g, '-'),
      shopId,
    }),
  );
}
