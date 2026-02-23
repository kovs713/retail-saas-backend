import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from '../types/request.type';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest<Request>().user;
  },
);
