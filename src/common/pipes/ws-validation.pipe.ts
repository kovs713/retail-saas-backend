import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { PipeTransform, Type } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export class WsValidationPipe<T extends object> implements PipeTransform {
  constructor(private readonly dtoClass: Type<T>) {}

  async transform(value: unknown): Promise<T> {
    if (!value || typeof value !== 'object') {
      throw new WsException('Invalid payload');
    }

    const dto = plainToInstance(this.dtoClass, value);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const messages = errors.flatMap((err) => Object.values(err.constraints ?? {}));
      throw new WsException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: messages,
      });
    }

    return dto;
  }
}
