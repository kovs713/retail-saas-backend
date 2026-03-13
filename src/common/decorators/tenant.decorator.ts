/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../types/tenant-context.type';

export const Tenant = createParamDecorator((data: unknown, ctx: ExecutionContext): TenantContext => {
  const request = ctx.switchToHttp().getRequest();
  return {
    organizationId: request.user.organizationId,
  };
});
