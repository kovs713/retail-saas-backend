import { ChattDto } from './chat.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('ChattDto', () => {
  it('should pass validation with valid message', async () => {
    const dto = plainToClass(ChattDto, { message: 'What is NestJS?' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional maxResults', async () => {
    const dto = plainToClass(ChattDto, {
      message: 'What is NestJS?',
      maxResults: 5,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with optional systemPrompt', async () => {
    const dto = plainToClass(ChattDto, {
      message: 'What is NestJS?',
      systemPrompt: 'You are a helpful assistant',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with all fields', async () => {
    const dto = plainToClass(ChattDto, {
      message: 'What is NestJS?',
      maxResults: 10,
      systemPrompt: 'You are a NestJS expert',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without message', async () => {
    const dto = plainToClass(ChattDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('message');
  });

  it('should fail validation with non-string message', async () => {
    const dto = plainToClass(ChattDto, { message: 123 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('message');
  });

  it('should pass validation with negative maxResults (no min constraint)', async () => {
    const dto = plainToClass(ChattDto, {
      message: 'Test',
      maxResults: -5,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation with non-string systemPrompt', async () => {
    const dto = plainToClass(ChattDto, {
      message: 'Test',
      systemPrompt: 123,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('systemPrompt');
  });
});
