import { Request } from '@/app/core/auth/types/request.type';
import { TokenPayload } from '@/core/auth/types/token-payload.type';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext): TokenPayload => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user: TokenPayload = request.user;

  return user;
});
