import { AuthResponseDto } from './auth-response.dto';

import { validate } from 'class-validator';

describe('AuthResponseDto', () => {
  const validUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'owner',
    shopId: 'shop-456',
    isActive: true,
  };

  it('should pass validation with valid data', async () => {
    const dto = new AuthResponseDto();
    dto.email = 'test@example.com';
    dto.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';
    dto.user = validUser;

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation without refreshToken', async () => {
    const dto = new AuthResponseDto();
    dto.email = 'test@example.com';
    dto.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    dto.user = validUser;

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without email', async () => {
    const dto = new AuthResponseDto();
    dto.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';
    dto.user = validUser;

    const typedDto = dto as any;
    typedDto.email = undefined;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation with invalid email', async () => {
    const dto = new AuthResponseDto();
    dto.email = 'invalid-email';
    dto.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';
    dto.user = validUser;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation without accessToken', async () => {
    const dto = new AuthResponseDto();
    dto.email = 'test@example.com';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';
    dto.user = validUser;

    const typedDto = dto as any;
    typedDto.accessToken = undefined;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('accessToken');
  });

  it('should fail validation with non-string accessToken', async () => {
    const dto = new AuthResponseDto();
    dto.email = 'test@example.com';
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh';
    dto.user = validUser;

    const typedDto = dto as any;
    typedDto.accessToken = 12345;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('accessToken');
  });
});
