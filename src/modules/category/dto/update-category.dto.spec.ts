import { UpdateCategoryDto } from './update-category.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('UpdateCategoryDto', () => {
  it('should pass validation with empty data', async () => {
    const dto = plainToClass(UpdateCategoryDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with partial data', async () => {
    const dto = plainToClass(UpdateCategoryDto, {
      name: 'Updated Electronics',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with all fields', async () => {
    const dto = plainToClass(UpdateCategoryDto, {
      name: 'Updated Electronics',
      slug: 'updated-electronics',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass when name is empty string (optional field)', async () => {
    const dto = plainToClass(UpdateCategoryDto, {
      name: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass when slug is empty string (optional field)', async () => {
    const dto = plainToClass(UpdateCategoryDto, {
      slug: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when name exceeds max length', async () => {
    const dto = plainToClass(UpdateCategoryDto, {
      name: 'C'.repeat(101),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('should pass when slug is empty string (optional field)', async () => {
    const dto = plainToClass(UpdateCategoryDto, {
      slug: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when slug exceeds max length', async () => {
    const dto = plainToClass(UpdateCategoryDto, {
      slug: 'e'.repeat(101),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.map((e) => e.property)).toContain('slug');
  });
});
