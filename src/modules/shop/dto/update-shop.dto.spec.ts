import { UpdateShopDto } from './update-shop.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('UpdateShopDto', () => {
  it('should pass validation with empty data', async () => {
    const dto = plainToClass(UpdateShopDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with partial data', async () => {
    const dto = plainToClass(UpdateShopDto, {
      name: 'Updated Shop',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with most fields', async () => {
    const dto = plainToClass(UpdateShopDto, {
      name: 'Updated Shop',
      slug: 'updated-shop',
      description: 'Updated description',
      address: '456 New St',
      phone: '+9876543210',
      logoUrl: 'https://example.com/new-logo.png',
      bannerUrl: 'https://example.com/new-banner.png',
      isActive: true,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass when name is empty string (optional field)', async () => {
    const dto = plainToClass(UpdateShopDto, {
      name: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass when slug is empty string (optional field)', async () => {
    const dto = plainToClass(UpdateShopDto, {
      slug: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional description', async () => {
    const dto = plainToClass(UpdateShopDto, {
      description: 'Updated description',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional address', async () => {
    const dto = plainToClass(UpdateShopDto, {
      address: '456 New St',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional phone', async () => {
    const dto = plainToClass(UpdateShopDto, {
      phone: '+9876543210',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional workingHours', async () => {
    const dto = plainToClass(UpdateShopDto, {
      workingHours: {
        monday: '10:00-18:00',
        tuesday: '10:00-18:00',
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass with optional logoUrl', async () => {
    const dto = plainToClass(UpdateShopDto, {
      logoUrl: 'https://example.com/new-logo.png',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when logoUrl is invalid', async () => {
    const dto = plainToClass(UpdateShopDto, {
      logoUrl: 'not-a-url',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('logoUrl');
  });

  it('should pass with optional bannerUrl', async () => {
    const dto = plainToClass(UpdateShopDto, {
      bannerUrl: 'https://example.com/new-banner.png',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when bannerUrl is invalid', async () => {
    const dto = plainToClass(UpdateShopDto, {
      bannerUrl: 'not-a-url',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('bannerUrl');
  });

  it('should pass with optional isActive', async () => {
    const dto = plainToClass(UpdateShopDto, {
      isActive: false,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when isActive is not boolean', async () => {
    const dto = plainToClass(UpdateShopDto, {
      isActive: 'false' as any,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('isActive');
  });
});
