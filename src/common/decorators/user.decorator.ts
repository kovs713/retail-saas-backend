import { Request, TokenPayload } from '../types';

import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const userFactory = (_data: unknown, ctx: ExecutionContext): TokenPayload => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.user) {
    throw new UnauthorizedException('Missing user context');
  }
  return request.user;
};

export const User = createParamDecorator(userFactory);
