import { Request, TenantContext } from '../types';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Tenant = createParamDecorator((data: unknown, ctx: ExecutionContext): TenantContext => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return {
    shopId: request.user.shopId,
  };
});
