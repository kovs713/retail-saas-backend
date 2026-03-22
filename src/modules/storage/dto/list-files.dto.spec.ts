import { ListFilesDto } from './list-files.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('ListFilesDto', () => {
  it('should pass validation with empty data', async () => {
    const dto = plainToClass(ListFilesDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with valid prefix', async () => {
    const dto = plainToClass(ListFilesDto, { prefix: 'documents/' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with valid limit', async () => {
    const dto = plainToClass(ListFilesDto, { limit: 50 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with valid page', async () => {
    const dto = plainToClass(ListFilesDto, { page: 2 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with valid startAfter', async () => {
    const dto = plainToClass(ListFilesDto, { startAfter: 'documents/file-5.pdf' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation with negative limit', async () => {
    const dto = plainToClass(ListFilesDto, { limit: -10 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('limit');
  });

  it('should fail validation with negative page', async () => {
    const dto = plainToClass(ListFilesDto, { page: -1 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('page');
  });

  it('should fail validation with non-string prefix', async () => {
    const dto = plainToClass(ListFilesDto, { prefix: 123 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('prefix');
  });

  it('should transform string numbers to numbers', async () => {
    const dto = plainToClass(ListFilesDto, { limit: '50', page: '2' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(typeof dto.limit).toBe('number');
    expect(typeof dto.page).toBe('number');
  });
});
