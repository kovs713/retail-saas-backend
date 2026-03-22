import { AuthOutputDto } from './auth-output.dto';

import { validate } from 'class-validator';

describe('AuthOutputDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = new AuthOutputDto();
    dto.email = 'test@example.com';
    dto.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation without refreshToken', async () => {
    const dto = new AuthOutputDto();
    dto.email = 'test@example.com';
    dto.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without email', async () => {
    const dto = new AuthOutputDto();
    dto.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';

    const typedDto = dto as any;
    typedDto.email = undefined;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation with invalid email', async () => {
    const dto = new AuthOutputDto();
    dto.email = 'invalid-email';
    dto.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation without accessToken', async () => {
    const dto = new AuthOutputDto();
    dto.email = 'test@example.com';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';

    const typedDto = dto as any;
    typedDto.accessToken = undefined;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('accessToken');
  });

  it('should fail validation with non-string accessToken', async () => {
    const dto = new AuthOutputDto();
    dto.email = 'test@example.com';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';

    const typedDto = dto as any;
    typedDto.accessToken = 12345;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('accessToken');
  });
});
