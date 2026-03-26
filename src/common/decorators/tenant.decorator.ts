import { Request, TenantContext } from '../types';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const tenantFactory = (_data: unknown, ctx: ExecutionContext): TenantContext => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return {
    shopId: request.user.shopId,
  };
};

export const Tenant = createParamDecorator(tenantFactory);
