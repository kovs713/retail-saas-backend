import { CreateShopDto } from './create-shop.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('CreateShopDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when name is missing', async () => {
    const dto = plainToClass(CreateShopDto, {
      slug: 'test-shop',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when name is empty string', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: '',
      slug: 'test-shop',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when slug is missing', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('slug');
  });

  it('should fail when slug is empty string', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: '',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('slug');
  });

  it('should pass when ownerId is missing (optional field)', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass when ownerId is provided', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      ownerId: 'user-123',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional description', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      description: 'A test shop description',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional address', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      address: '123 Main St',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional phone', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      phone: '+1234567890',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional workingHours as object', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      workingHours: {
        monday: '9:00-17:00',
        tuesday: '9:00-17:00',
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional logoUrl', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      logoUrl: 'https://example.com/logo.png',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when logoUrl is invalid', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      logoUrl: 'not-a-url',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('logoUrl');
  });

  it('should pass with optional bannerUrl', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      bannerUrl: 'https://example.com/banner.png',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when bannerUrl is invalid', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      bannerUrl: 'not-a-url',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('bannerUrl');
  });

  it('should pass with optional isActive', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      isActive: true,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when isActive is not boolean', async () => {
    const dto = plainToClass(CreateShopDto, {
      name: 'Test Shop',
      slug: 'test-shop',
      isActive: 'true' as any,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('isActive');
  });
});
