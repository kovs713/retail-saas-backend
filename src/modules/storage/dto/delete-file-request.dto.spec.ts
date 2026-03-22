import { DeleteFileRequestDto } from './delete-file-request.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('DeleteFileRequestDto', () => {
  it('should pass validation with valid key', async () => {
    const dto = plainToClass(DeleteFileRequestDto, { key: 'documents/report.pdf' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional bucket', async () => {
    const dto = plainToClass(DeleteFileRequestDto, {
      key: 'documents/report.pdf',
      bucket: 'my-bucket',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without key', async () => {
    const dto = plainToClass(DeleteFileRequestDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('key');
  });

  it('should fail validation with non-string key', async () => {
    const dto = plainToClass(DeleteFileRequestDto, { key: 123 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('key');
  });

  it('should fail validation with non-string bucket', async () => {
    const dto = plainToClass(DeleteFileRequestDto, {
      key: 'documents/report.pdf',
      bucket: 123,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('bucket');
  });
});
