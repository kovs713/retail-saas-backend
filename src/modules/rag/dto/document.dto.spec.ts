import { DocumentDto } from './document.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('DocumentDto', () => {
  it('should pass validation with valid content', async () => {
    const dto = plainToClass(DocumentDto, { content: 'This is a test document' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional metadata', async () => {
    const dto = plainToClass(DocumentDto, {
      content: 'Test document',
      metadata: { source: 'test', author: 'John' },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without content', async () => {
    const dto = plainToClass(DocumentDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('content');
  });

  it('should fail validation with non-string content', async () => {
    const dto = plainToClass(DocumentDto, { content: 123 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('content');
  });

  it('should fail validation with non-object metadata', async () => {
    const dto = plainToClass(DocumentDto, {
      content: 'Test',
      metadata: 'not-an-object',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('metadata');
  });
});
