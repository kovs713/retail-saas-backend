import { SourceDto } from './source.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('SourceDto', () => {
  it('should pass validation with valid content', async () => {
    const dto = plainToClass(SourceDto, { content: 'Source content' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional metadata', async () => {
    const dto = plainToClass(SourceDto, {
      content: 'Source content',
      metadata: { source: 'test', page: 1 },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without content', async () => {
    const dto = plainToClass(SourceDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('content');
  });

  it('should fail validation with non-string content', async () => {
    const dto = plainToClass(SourceDto, { content: 123 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('content');
  });

  it('should fail validation with non-object metadata', async () => {
    const dto = plainToClass(SourceDto, {
      content: 'Test',
      metadata: 'not-an-object',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('metadata');
  });
});
