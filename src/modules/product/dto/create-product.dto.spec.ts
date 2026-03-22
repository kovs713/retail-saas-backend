import { CreateProductDto } from './create-product.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('CreateProductDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when sku is missing', async () => {
    const dto = plainToClass(CreateProductDto, {
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('sku');
  });

  it('should fail when sku exceeds max length', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'P'.repeat(51),
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('sku');
  });

  it('should fail when name is missing', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      price: 99.99,
      quantity: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when name exceeds max length', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'P'.repeat(201),
      price: 99.99,
      quantity: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when price is missing', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      quantity: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('price');
  });

  it('should fail when price is negative', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: -10,
      quantity: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('price');
  });

  it('should fail when price is zero', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 0,
      quantity: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('price');
  });

  it('should fail when quantity is missing', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('quantity');
  });

  it('should fail when quantity is negative', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: -5,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('quantity');
  });

  it('should pass with optional description', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      description: 'A test product description',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when description exceeds max length', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      description: 'D'.repeat(2001),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('description');
  });

  it('should pass with optional cost', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      cost: 50.0,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when cost is negative', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      cost: -10,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('cost');
  });

  it('should pass with optional categoryId', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional barcode', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      barcode: '5901234123457',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when barcode exceeds max length', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      barcode: 'B'.repeat(51),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('barcode');
  });

  it('should pass with optional images array', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when images contains invalid URL', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      images: ['not-a-url'],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('images');
  });

  it('should pass with optional metadata', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: 99.99,
      quantity: 100,
      metadata: { brand: 'TechBrand', color: 'Black' },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should not transform string values to numbers without explicit transformation', async () => {
    const dto = plainToClass(CreateProductDto, {
      sku: 'PROD-001',
      name: 'Test Product',
      price: '99.99',
      quantity: '100',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('price');
    expect(errors.map((e) => e.property)).toContain('quantity');
  });
});
