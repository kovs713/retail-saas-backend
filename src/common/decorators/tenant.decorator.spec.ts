import { TenantContext } from '../types';
import { tenantFactory } from './tenant.decorator';

import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('Tenant Decorator', () => {
  const buildContext = (user: unknown): ExecutionContext =>
    createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    });

  it('should extract shopId from request.user', () => {
    const ctx = buildContext({ shopId: 'test-shop-id' });
    const result = tenantFactory(undefined, ctx);
    expect(result).toEqual<TenantContext>({ shopId: 'test-shop-id' });
  });

  it('should throw UnauthorizedException when user is undefined', () => {
    const ctx = buildContext(undefined);
    expect(() => tenantFactory(undefined, ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when shopId is missing', () => {
    const ctx = buildContext({});
    expect(() => tenantFactory(undefined, ctx)).toThrow(UnauthorizedException);
  });
});
