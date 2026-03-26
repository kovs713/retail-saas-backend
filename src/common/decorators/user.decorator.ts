import { Request, TokenPayload } from '../types';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const userFactory = (_data: unknown, ctx: ExecutionContext): TokenPayload => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user;
};

export const User = createParamDecorator(userFactory);
