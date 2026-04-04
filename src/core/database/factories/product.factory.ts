import { CreateProductDto, UpdateProductDto } from '@/modules/product/dto';
import { Product } from '@/modules/product/entities';

import { createCategory } from './category.factory';
import { generateId } from './shared.utils';

const DEFAULTS = {
  skuPrefix: 'TEST',
  namePrefix: 'Test Product',
  price: 29.99,
  cost: 15.0,
  quantity: 100,
  description: 'A test product description',
};

function defaultCategoryId(index: number): string {
  return createCategory({ index }).id;
}

interface ProductFactoryOptions {
  index?: number;
  overrides?: Partial<CreateProductDto>;
  includeOptional?: boolean;
}

function buildProductDto(options: ProductFactoryOptions = {}): CreateProductDto {
  const { index = 1, overrides = {}, includeOptional = true } = options;

  const base: CreateProductDto = {
    sku: overrides.sku || `${DEFAULTS.skuPrefix}-${String(index).padStart(3, '0')}`,
    name: overrides.name || `${DEFAULTS.namePrefix} ${index}`,
    price: overrides.price ?? DEFAULTS.price,
    quantity: overrides.quantity ?? DEFAULTS.quantity,
  };

  if (includeOptional || overrides.description !== undefined) {
    base.description = overrides.description ?? DEFAULTS.description;
  }
  if (includeOptional || overrides.cost !== undefined) {
    base.cost = overrides.cost ?? DEFAULTS.cost;
  }
  if (includeOptional || overrides.categoryId !== undefined) {
    base.categoryId = overrides.categoryId ?? defaultCategoryId(index);
  }
  if (includeOptional || overrides.barcode !== undefined) {
    base.barcode = overrides.barcode || generateBarcode(index);
  }
  if (includeOptional || overrides.images !== undefined) {
    base.images = overrides.images || [`https://example.com/product-${index}.jpg`];
  }
  if (includeOptional || overrides.metadata !== undefined) {
    base.metadata = overrides.metadata || { test: true, index };
  }

  return base;
}

export function createProductDto(options: ProductFactoryOptions = {}): CreateProductDto {
  return buildProductDto(options);
}

export function createProduct(options: ProductFactoryOptions & { id?: string } = {}): Product {
  const { id, index = 1, overrides = {}, includeOptional = true } = options;
  const dto = buildProductDto({ index, overrides, includeOptional });
  const now = new Date();

  return {
    id: id || generateId('prod', index),
    ...dto,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  } as Product;
}

export function createProducts(count: number, options: Omit<ProductFactoryOptions, 'index'> = {}): Product[] {
  return Array.from({ length: count }, (_, i) => createProduct({ ...options, index: i + 1 }));
}

export function createUpdateProductDto(overrides: Partial<UpdateProductDto> = {}): UpdateProductDto {
  return {
    name: overrides.name || 'Updated Product Name',
    price: overrides.price ?? 39.99,
    quantity: overrides.quantity ?? 75,
    ...overrides,
  };
}

export function createLowStockProduct(quantity = 5, overrides: Partial<CreateProductDto> = {}): CreateProductDto {
  return buildProductDto({ overrides: { ...overrides, quantity } });
}

export function createOutOfStockProduct(overrides: Partial<CreateProductDto> = {}): CreateProductDto {
  return createLowStockProduct(0, overrides);
}

export function createHighValueProduct(price = 199.99, overrides: Partial<CreateProductDto> = {}): CreateProductDto {
  return buildProductDto({ overrides: { ...overrides, price } });
}

export function createProductByCategory(
  categoryId: string,
  overrides: Partial<CreateProductDto> = {},
): CreateProductDto {
  return buildProductDto({ overrides: { ...overrides, categoryId } });
}

export function createElectronicsProduct(overrides: Partial<CreateProductDto> = {}): CreateProductDto {
  return createProductByCategory('Electronics', {
    ...overrides,
    metadata: { ...overrides.metadata, type: 'electronics' },
  });
}

export function createClothingProduct(overrides: Partial<CreateProductDto> = {}): CreateProductDto {
  return createProductByCategory('Clothing', {
    ...overrides,
    metadata: { ...overrides.metadata, type: 'clothing' },
  });
}

export function createInvalidProduct(invalidFields: Record<string, unknown>): Partial<CreateProductDto> {
  return { ...buildProductDto(), ...invalidFields };
}

export function createMinimalProduct(
  overrides: Partial<Pick<CreateProductDto, 'sku' | 'name' | 'price' | 'quantity'>> = {},
): CreateProductDto {
  return buildProductDto({ index: 1, overrides, includeOptional: false });
}

export function createDeletedProduct(overrides: Partial<CreateProductDto> = {}): Product {
  const product = createProduct({ overrides });
  product.deletedAt = new Date();
  return product;
}

function generateBarcode(index: number): string {
  const base = '5901234123';
  const paddedIndex = String(index).padStart(3, '0');
  const partial = base + paddedIndex;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(partial[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return partial + checkDigit;
}

export function generateRandomSku(prefix = 'RAND'): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

export function generateRandomPrice(min = 10, max = 500): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

export function createVariedProducts(count: number): Product[] {
  const categoryIds = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5'];
  return Array.from({ length: count }, (_, i) => {
    const categoryId = categoryIds[i % categoryIds.length];
    return createProduct({
      index: i + 1,
      overrides: {
        categoryId,
        price: generateRandomPrice(20, 200),
        quantity: Math.floor(Math.random() * 200),
      },
    });
  });
}

export function createPaginationTestProducts(pageSize = 10): CreateProductDto[] {
  const categoryIds = ['cat-electronics', 'cat-clothing', 'cat-home'];
  return Array.from({ length: pageSize * 3 }, (_, i) =>
    buildProductDto({
      index: i + 1,
      overrides: {
        categoryId: categoryIds[i % 3],
        price: 10 + i * 5,
        quantity: 100 - i * 2,
      },
    }),
  );
}

export const SAMPLE_PRODUCTS: CreateProductDto[] = [
  {
    sku: 'ELEC-001',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse',
    price: 29.99,
    cost: 15.0,
    quantity: 150,
    categoryId: 'electronics-cat-uuid',
    barcode: '5901234123457',
    images: ['https://example.com/mouse.jpg'],
    metadata: { brand: 'TechBrand', color: 'Black' },
  },
  {
    sku: 'ELEC-002',
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard',
    price: 89.99,
    cost: 45.0,
    quantity: 75,
    categoryId: 'electronics-cat-uuid',
    barcode: '5901234123458',
    images: ['https://example.com/keyboard.jpg'],
    metadata: { brand: 'TechBrand' },
  },
  {
    sku: 'ACC-001',
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub',
    price: 49.99,
    cost: 25.0,
    quantity: 200,
    categoryId: 'accessories-cat-uuid',
    barcode: '5901234123459',
    images: ['https://example.com/hub.jpg'],
    metadata: { brand: 'ConnectPro', ports: 7 },
  },
];

export const PRICE_RANGE_TEST_PRODUCTS: CreateProductDto[] = [
  buildProductDto({ index: 1, overrides: { sku: 'PRICE-001', price: 9.99 } }),
  buildProductDto({ index: 2, overrides: { sku: 'PRICE-002', price: 24.99 } }),
  buildProductDto({ index: 3, overrides: { sku: 'PRICE-003', price: 49.99 } }),
  buildProductDto({ index: 4, overrides: { sku: 'PRICE-004', price: 99.99 } }),
  buildProductDto({ index: 5, overrides: { sku: 'PRICE-005', price: 199.99 } }),
];

export const CATEGORY_TEST_PRODUCTS: CreateProductDto[] = [
  createProductByCategory('Electronics', { sku: 'CAT-ELEC-001' }),
  createProductByCategory('Electronics', { sku: 'CAT-ELEC-002' }),
  createProductByCategory('Clothing', { sku: 'CAT-CLTH-001' }),
  createProductByCategory('Clothing', { sku: 'CAT-CLTH-002' }),
  createProductByCategory('Home', { sku: 'CAT-HOME-001' }),
];
