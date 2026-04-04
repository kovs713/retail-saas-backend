import { Category } from '@/modules/product/entities';

export interface CreateCategoryOptions {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  shopId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function createCategory(options: CreateCategoryOptions = {}): Partial<Category> {
  const name = options.name || 'Test Category';

  return {
    name,
    slug: options.slug || name.toLowerCase().replace(/\s+/g, '-'),
    shopId: options.shopId || '',
  };
}

export function createCategoryEntity(options: CreateCategoryOptions = {}): Category {
  const name = options.name || 'Test Category';
  const now = new Date();

  return {
    id: options.id ?? 'cat_001',
    name,
    slug: options.slug || name.toLowerCase().replace(/\s+/g, '-'),
    shopId: options.shopId || 'shop_001',
    shop: null as unknown as Category['shop'],
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
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
