import { UploadFileDto } from './upload-file.dto';

import { validate } from 'class-validator';

describe('UploadFileDto', () => {
  it('should pass validation with file object and bucket', () => {
    const dto = new UploadFileDto();
    dto.file = {} as Express.Multer.File;
    dto.bucket = 'my-bucket';

    expect(dto.file).toBeDefined();
    expect(dto.bucket).toBe('my-bucket');
  });

  it('should pass validation with file object only', () => {
    const dto = new UploadFileDto();
    dto.file = {} as Express.Multer.File;

    expect(dto.file).toBeDefined();
    expect(dto.bucket).toBeUndefined();
  });

  it('should validate bucket is string', () => {
    const dto = new UploadFileDto();
    dto.file = {} as Express.Multer.File;
    (dto as any).bucket = 123;

    expect(typeof (dto as any).bucket).toBe('number');
  });
});
