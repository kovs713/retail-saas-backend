import { Request, TokenPayload } from '../types';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext): TokenPayload => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user: TokenPayload = request.user;

  return user;
});
