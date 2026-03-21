import { faker } from '@faker-js/faker';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: string;
  shopId?: string | null;
}

export interface TestShop {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface TestProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  categoryId?: string | null;
}

export interface TestCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shopId: string;
  parentId?: string | null;
}

export class TestFactories {
  static createUser(overrides?: Partial<TestUser>): TestUser {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      role: 'owner',
      shopId: null,
      ...overrides,
    };
  }

  static createShop(overrides?: Partial<TestShop>): TestShop {
    return {
      id: faker.string.uuid(),
      ownerId: faker.string.uuid(),
      name: faker.company.name(),
      slug: faker.helpers.slugify(faker.company.name().toLowerCase()),
      description: faker.company.catchPhrase(),
      ...overrides,
    };
  }

  static createProduct(overrides?: Partial<TestProduct>): TestProduct {
    return {
      id: faker.string.uuid(),
      sku: faker.string.alphanumeric(8).toUpperCase(),
      name: faker.commerce.productName(),
      price: parseFloat(faker.commerce.price()),
      quantity: faker.number.int({ min: 0, max: 1000 }),
      shopId: faker.string.uuid(),
      ...overrides,
    };
  }

  static createCategory(overrides?: Partial<TestCategory>): TestCategory {
    return {
      id: faker.string.uuid(),
      name: faker.commerce.department(),
      slug: faker.helpers.slugify(faker.commerce.department().toLowerCase()),
      description: faker.commerce.productDescription(),
      shopId: faker.string.uuid(),
      parentId: null,
      ...overrides,
    };
  }
}
