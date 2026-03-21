import { UpdateProductDto } from './update-product.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('UpdateProductDto', () => {
  it('should pass validation with empty data', async () => {
    const dto = plainToClass(UpdateProductDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with partial data', async () => {
    const dto = plainToClass(UpdateProductDto, {
      name: 'Updated Product',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with all fields', async () => {
    const dto = plainToClass(UpdateProductDto, {
      sku: 'PROD-002',
      name: 'Updated Product',
      price: 149.99,
      quantity: 50,
      description: 'Updated description',
      cost: 75.0,
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      barcode: '5901234123457',
      images: ['https://example.com/image1.jpg'],
      metadata: { brand: 'UpdatedBrand' },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when sku is empty string', async () => {
    const dto = plainToClass(UpdateProductDto, {
      sku: '',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('sku');
  });

  it('should fail when sku exceeds max length', async () => {
    const dto = plainToClass(UpdateProductDto, {
      sku: 'P'.repeat(51),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('sku');
  });

  it('should fail when name is empty string', async () => {
    const dto = plainToClass(UpdateProductDto, {
      name: '',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when name exceeds max length', async () => {
    const dto = plainToClass(UpdateProductDto, {
      name: 'P'.repeat(201),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when price is negative', async () => {
    const dto = plainToClass(UpdateProductDto, {
      price: -10,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('price');
  });

  it('should fail when price is zero', async () => {
    const dto = plainToClass(UpdateProductDto, {
      price: 0,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('price');
  });

  it('should fail when quantity is negative', async () => {
    const dto = plainToClass(UpdateProductDto, {
      quantity: -5,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('quantity');
  });

  it('should fail when description exceeds max length', async () => {
    const dto = plainToClass(UpdateProductDto, {
      description: 'D'.repeat(2001),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('description');
  });

  it('should fail when cost is negative', async () => {
    const dto = plainToClass(UpdateProductDto, {
      cost: -10,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('cost');
  });

  it('should fail when barcode exceeds max length', async () => {
    const dto = plainToClass(UpdateProductDto, {
      barcode: 'B'.repeat(51),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('barcode');
  });

  it('should fail when images contains invalid URL', async () => {
    const dto = plainToClass(UpdateProductDto, {
      images: ['not-a-url'],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('images');
  });

  it('should not transform string values to numbers without explicit transformation', async () => {
    const dto = plainToClass(UpdateProductDto, {
      price: '99.99',
      quantity: '100',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('price');
    expect(errors.map((e) => e.property)).toContain('quantity');
  });
});
