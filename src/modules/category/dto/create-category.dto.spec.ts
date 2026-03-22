import { CreateCategoryDto } from './create-category.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('CreateCategoryDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToClass(CreateCategoryDto, {
      name: 'Electronics',
      slug: 'electronics',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when name is missing', async () => {
    const dto = plainToClass(CreateCategoryDto, {
      slug: 'electronics',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when name is empty string', async () => {
    const dto = plainToClass(CreateCategoryDto, {
      name: '',
      slug: 'electronics',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when name exceeds max length', async () => {
    const dto = plainToClass(CreateCategoryDto, {
      name: 'C'.repeat(101),
      slug: 'electronics',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should fail when slug is missing', async () => {
    const dto = plainToClass(CreateCategoryDto, {
      name: 'Electronics',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('slug');
  });

  it('should fail when slug is empty string', async () => {
    const dto = plainToClass(CreateCategoryDto, {
      name: 'Electronics',
      slug: '',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('slug');
  });

  it('should fail when slug exceeds max length', async () => {
    const dto = plainToClass(CreateCategoryDto, {
      name: 'Electronics',
      slug: 'e'.repeat(101),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('slug');
  });
});
