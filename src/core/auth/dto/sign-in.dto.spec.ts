import { SignInDto } from './sign-in.dto';

import { validate } from 'class-validator';

describe('SignInDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = new SignInDto();
    dto.id = '550e8400-e29b-41d4-a716-446655440000';
    dto.email = 'test@example.com';
    dto.organizationId = '550e8400-e29b-41d4-a716-446655440001';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without id', async () => {
    const dto = new SignInDto();
    (dto as any).id = undefined;
    dto.email = 'test@example.com';
    dto.organizationId = '550e8400-e29b-41d4-a716-446655440001';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('id');
  });

  it('should fail validation with invalid UUID id', async () => {
    const dto = new SignInDto();
    dto.id = 'invalid-uuid';
    dto.email = 'test@example.com';
    dto.organizationId = '550e8400-e29b-41d4-a716-446655440001';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('id');
  });

  it('should fail validation without email', async () => {
    const dto = new SignInDto();
    dto.id = '550e8400-e29b-41d4-a716-446655440000';
    (dto as any).email = undefined;
    dto.organizationId = '550e8400-e29b-41d4-a716-446655440001';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation with invalid email', async () => {
    const dto = new SignInDto();
    dto.id = '550e8400-e29b-41d4-a716-446655440000';
    dto.email = 'invalid-email';
    dto.organizationId = '550e8400-e29b-41d4-a716-446655440001';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation without organizationId', async () => {
    const dto = new SignInDto();
    dto.id = '550e8400-e29b-41d4-a716-446655440000';
    dto.email = 'test@example.com';
    (dto as any).organizationId = undefined;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('organizationId');
  });

  it('should fail validation with invalid UUID organizationId', async () => {
    const dto = new SignInDto();
    dto.id = '550e8400-e29b-41d4-a716-446655440000';
    dto.email = 'test@example.com';
    dto.organizationId = 'invalid-uuid';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('organizationId');
  });
});
