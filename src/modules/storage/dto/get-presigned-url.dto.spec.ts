import { GetPresignedUrlDto } from './get-presigned-url.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('GetPresignedUrlDto', () => {
  it('should pass validation with valid key', async () => {
    const dto = plainToClass(GetPresignedUrlDto, { key: 'documents/report.pdf' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional bucket', async () => {
    const dto = plainToClass(GetPresignedUrlDto, {
      key: 'documents/report.pdf',
      bucket: 'my-bucket',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional expirySeconds', async () => {
    const dto = plainToClass(GetPresignedUrlDto, {
      key: 'documents/report.pdf',
      expirySeconds: 7200,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without key', async () => {
    const dto = plainToClass(GetPresignedUrlDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('key');
  });

  it('should fail validation with non-string key', async () => {
    const dto = plainToClass(GetPresignedUrlDto, { key: 123 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('key');
  });

  it('should fail validation with negative expirySeconds', async () => {
    const dto = plainToClass(GetPresignedUrlDto, {
      key: 'documents/report.pdf',
      expirySeconds: -100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('expirySeconds');
  });

  it('should transform string numbers to numbers', async () => {
    const dto = plainToClass(GetPresignedUrlDto, {
      key: 'documents/report.pdf',
      expirySeconds: '7200',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(typeof dto.expirySeconds).toBe('number');
  });
});
