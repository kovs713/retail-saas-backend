import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export class WsValidationPipe<T extends object> implements PipeTransform {
  constructor(private readonly dtoClass: Type<T>) {}

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<T> {
    const metatype = metadata.metatype;
    if (!metatype || !this.isConstructor(metatype)) {
      return value as T;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new WsException('Invalid payload');
    }

    const dto = plainToInstance(this.dtoClass, value);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const messages = errors.flatMap((err) =>
        Object.values(err.constraints ?? {}),
      );
      throw new WsException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: messages,
      });
    }

    return dto;
  }

  private isConstructor(
    fn: unknown,
  ): fn is new (...args: unknown[]) => unknown {
    return typeof fn === 'function' && !!fn.prototype;
  }
}
