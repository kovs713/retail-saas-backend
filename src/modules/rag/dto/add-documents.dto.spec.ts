import { AddDocumentstDto } from './add-documents.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('AddDocumentstDto', () => {
  it('should pass validation with valid documents array', async () => {
    const dto = plainToClass(AddDocumentstDto, {
      documents: [{ content: 'Doc 1' }, { content: 'Doc 2' }],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional source', async () => {
    const dto = plainToClass(AddDocumentstDto, {
      documents: [{ content: 'Doc 1' }],
      source: 'test-source',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with documents having metadata', async () => {
    const dto = plainToClass(AddDocumentstDto, {
      documents: [
        { content: 'Doc 1', metadata: { author: 'John' } },
        { content: 'Doc 2', metadata: { author: 'Jane' } },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without documents', async () => {
    const dto = plainToClass(AddDocumentstDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('documents');
  });

  it('should fail validation with non-array documents', async () => {
    const dto = plainToClass(AddDocumentstDto, { documents: 'not-an-array' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('documents');
  });

  it('should fail validation with invalid document in array', async () => {
    const dto = plainToClass(AddDocumentstDto, {
      documents: [{ content: 'Valid' }, { content: 123 }],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation with non-string source', async () => {
    const dto = plainToClass(AddDocumentstDto, {
      documents: [{ content: 'Doc' }],
      source: 123,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('source');
  });
});
