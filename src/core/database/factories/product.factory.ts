import { Product } from '@/modules/product/entities';
import { DEFAULT_IDS } from './defaults';
import { createMany, generateId } from './shared.utils';

export function createProduct(overrides: Partial<Product> & { index?: number } = {}): Product {
  const { index = 1, ...fields } = overrides;
  const now = new Date();
  return {
    id: generateId('prod', index),
    shopId: DEFAULT_IDS.shopId(index),
    sku: `TEST-${String(index).padStart(3, '0')}`,
    name: `Test Product ${index}`,
    description: null,
    price: 2999,
    cost: null,
    quantity: 100,
    categoryId: null,
    barcode: null,
    images: [],
    metadata: null,
    externalSource: null,
    externalId: null,
    externalStoreId: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...fields,
  } as Product;
}

export function createProducts(count: number, overrides: Partial<Product> = {}): Product[] {
  return createMany(count, (i) => createProduct({ ...overrides, index: i }));
}

export function createDeletedProduct(overrides: Partial<Product> = {}): Product {
  return createProduct({ ...overrides, deletedAt: new Date() });
}
