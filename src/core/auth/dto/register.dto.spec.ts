import { RegisterDto } from './register.dto';

import { validate } from 'class-validator';

describe('RegisterDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = new RegisterDto();
    dto.email = 'test@example.com';
    dto.password = 'password123';
    dto.shopName = 'Test Shop';
    dto.shopSlug = 'test-shop';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with all optional fields', async () => {
    const dto = new RegisterDto();
    dto.email = 'test@example.com';
    dto.password = 'password123';
    dto.shopName = 'Test Shop';
    dto.shopSlug = 'test-shop';
    dto.shopDescription = 'A test shop';
    dto.shopAddress = '123 Test St';
    dto.shopPhone = '+1234567890';
    dto.shopWorkingHours = { mon: '9:00-18:00', tue: '9:00-18:00' };
    dto.isActive = true;

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without email', async () => {
    const dto = new RegisterDto();
    dto.password = 'password123';
    dto.shopName = 'Test Shop';
    dto.shopSlug = 'test-shop';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('email');
  });

  it('should fail validation with invalid email', async () => {
    const dto = new RegisterDto();
    dto.email = 'invalid-email';
    dto.password = 'password123';
    dto.shopName = 'Test Shop';
    dto.shopSlug = 'test-shop';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('email');
  });

  it('should fail validation without password', async () => {
    const dto = new RegisterDto();
    dto.email = 'test@example.com';
    dto.shopName = 'Test Shop';
    dto.shopSlug = 'test-shop';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('password');
  });

  it('should fail validation with short password', async () => {
    const dto = new RegisterDto();
    dto.email = 'test@example.com';
    dto.password = '12345';
    dto.shopName = 'Test Shop';
    dto.shopSlug = 'test-shop';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('password');
  });

  it('should fail validation without shopName', async () => {
    const dto = new RegisterDto();
    dto.email = 'test@example.com';
    dto.password = 'password123';
    dto.shopSlug = 'test-shop';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('shopName');
  });

  it('should fail validation without shopSlug', async () => {
    const dto = new RegisterDto();
    dto.email = 'test@example.com';
    dto.password = 'password123';
    dto.shopName = 'Test Shop';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('shopSlug');
  });

  it('should pass validation with minimum password length', async () => {
    const dto = new RegisterDto();
    dto.email = 'test@example.com';
    dto.password = '123456';
    dto.shopName = 'Test Shop';
    dto.shopSlug = 'test-shop';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
