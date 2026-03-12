import { Pagination } from './pagination.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('Pagination DTO', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToClass(Pagination, {
      page: 1,
      limit: 10,
      category: 'Electronics',
      minPrice: 10,
      maxPrice: 100,
      sortBy: 'price',
      sortOrder: 'ASC',
      search: 'test',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('page should default to 1', async () => {
    const dto = plainToClass(Pagination, {});

    expect(dto.page).toBe(1);
  });

  it('limit should default to 10', async () => {
    const dto = plainToClass(Pagination, {});

    expect(dto.limit).toBe(10);
  });

  it('page should be positive integer', async () => {
    const dto = plainToClass(Pagination, { page: 0 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('page');
  });

  it('page should accept string and transform to number', async () => {
    const dto = plainToClass(Pagination, { page: '2' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
  });

  it('limit should be positive integer', async () => {
    const dto = plainToClass(Pagination, { limit: 0 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('limit');
  });

  it('limit should be capped at 100', async () => {
    const dto = plainToClass(Pagination, { limit: 101 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('limit');
  });

  it('limit should accept string and transform to number', async () => {
    const dto = plainToClass(Pagination, { limit: '50' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(50);
  });

  it('should validate category as string', async () => {
    const dto = plainToClass(Pagination, { category: 123 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('category');
  });

  it('should validate minPrice as number', async () => {
    const dto = plainToClass(Pagination, { minPrice: 'not-a-number' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('minPrice');
  });

  it('should validate maxPrice as number', async () => {
    const dto = plainToClass(Pagination, { maxPrice: 'not-a-number' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('maxPrice');
  });

  it('minPrice should be non-negative', async () => {
    const dto = plainToClass(Pagination, { minPrice: -10 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('minPrice');
  });

  it('maxPrice should be non-negative', async () => {
    const dto = plainToClass(Pagination, { maxPrice: -10 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('maxPrice');
  });

  it('should validate sortBy as string', async () => {
    const dto = plainToClass(Pagination, { sortBy: 123 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('sortBy');
  });

  it('should validate sortOrder as string', async () => {
    const dto = plainToClass(Pagination, { sortOrder: 123 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('sortOrder');
  });

  it('should validate search as string', async () => {
    const dto = plainToClass(Pagination, { search: 123 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('search');
  });

  it('should transform string values to correct types', async () => {
    const dto = plainToClass(Pagination, {
      page: '3',
      limit: '25',
    });

    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(25);
  });

  it('should allow optional fields', async () => {
    const dto = plainToClass(Pagination, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
