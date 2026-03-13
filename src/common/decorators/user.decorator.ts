/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { TokenPayload } from '@/core/auth/types/token-payload.type';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: keyof TokenPayload | undefined, ctx: ExecutionContext): TokenPayload | string => {
    const request = ctx.switchToHttp().getRequest();
    const user: TokenPayload = request.user;

    if (data) {
      return user[data];
    }

    return user;
  },
);
