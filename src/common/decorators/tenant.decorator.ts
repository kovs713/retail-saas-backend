import { Request, TenantContext } from '../types';

import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const tenantFactory = (
  _data: unknown,
  ctx: ExecutionContext,
): TenantContext => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.user?.shopId) {
    throw new UnauthorizedException('Missing tenant context');
  }
  return { shopId: request.user.shopId };
};

export const Tenant = createParamDecorator(tenantFactory);
