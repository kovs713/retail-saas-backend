import { Request } from '@/app/core/auth/types/request.type';
import { TenantContext } from '../types/tenant-context.type';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Tenant = createParamDecorator((data: unknown, ctx: ExecutionContext): TenantContext => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return {
    shopId: request.user.shopId,
  };
});
