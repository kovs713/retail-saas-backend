import { AddTextsDto } from './add-texts.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('AddTextsDto', () => {
  it('should pass validation with valid texts array', async () => {
    const dto = plainToClass(AddTextsDto, { texts: ['Text 1', 'Text 2'] });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional metadata', async () => {
    const dto = plainToClass(AddTextsDto, {
      texts: ['Text 1'],
      metadata: [{ source: 'test' }],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional ids', async () => {
    const dto = plainToClass(AddTextsDto, {
      texts: ['Text 1'],
      ids: ['id-1'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with all fields', async () => {
    const dto = plainToClass(AddTextsDto, {
      texts: ['Text 1', 'Text 2'],
      metadata: [{ source: 'test1' }, { source: 'test2' }],
      ids: ['id-1', 'id-2'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without texts', async () => {
    const dto = plainToClass(AddTextsDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('texts');
  });

  it('should fail validation with non-array texts', async () => {
    const dto = plainToClass(AddTextsDto, { texts: 'not-an-array' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('texts');
  });

  it('should fail validation with non-string elements in texts', async () => {
    const dto = plainToClass(AddTextsDto, { texts: [123, 456] });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('texts');
  });

  it('should fail validation with non-array metadata', async () => {
    const dto = plainToClass(AddTextsDto, {
      texts: ['Text 1'],
      metadata: { source: 'test' },
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('metadata');
  });

  it('should fail validation with non-array ids', async () => {
    const dto = plainToClass(AddTextsDto, {
      texts: ['Text 1'],
      ids: 'not-an-array',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('ids');
  });
});
