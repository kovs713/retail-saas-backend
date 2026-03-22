import { SignInDto } from './sign-in.dto';

import { validate } from 'class-validator';

describe('SignInDto', () => {
  it('should pass validation with valid email and password', async () => {
    const dto = new SignInDto();
    dto.email = 'test@example.com';
    dto.password = 'password123';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without email', async () => {
    const dto = new SignInDto();
    dto.password = 'password123';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation with invalid email', async () => {
    const dto = new SignInDto();
    dto.email = 'invalid-email';
    dto.password = 'password123';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation without password', async () => {
    const dto = new SignInDto();
    dto.email = 'test@example.com';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('password');
  });

  it('should fail validation with short password', async () => {
    const dto = new SignInDto();
    dto.email = 'test@example.com';
    dto.password = '12345';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('password');
  });
});
