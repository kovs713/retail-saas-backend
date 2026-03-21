import { RefreshTokenDto } from './refresh-token.dto';

import { validate } from 'class-validator';

describe('RefreshTokenDto', () => {
  it('should pass validation with valid refreshToken', async () => {
    const dto = new RefreshTokenDto();
    dto.refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid-token';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without refreshToken', async () => {
    const dto = new RefreshTokenDto();

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('refreshToken');
  });

  it('should fail validation with non-string refreshToken', async () => {
    const dto = new RefreshTokenDto();
    (dto as any).refreshToken = 12345;

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('refreshToken');
  });
});
