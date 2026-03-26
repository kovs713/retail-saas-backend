import { TenantContext } from '../types';
import { tenantFactory } from './tenant.decorator';

import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';

describe('Tenant Decorator', () => {
  const mockTenantContext: TenantContext = {
    shopId: 'test-shop-id',
  };

  const buildContext = (user: unknown = mockTenantContext): ExecutionContext => {
    const mockRequest = { user } as never;
    return createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    });
  };

  it('should extract shopId from request.user', () => {
    const ctx = buildContext();
    const result = tenantFactory(undefined, ctx);

    expect(result).toEqual({ shopId: 'test-shop-id' });
  });

  it('should return TenantContext with shopId property', () => {
    const ctx = buildContext({ shopId: 'other-shop' });
    const result = tenantFactory(undefined, ctx);

    expect(result).toHaveProperty('shopId');
    expect(result.shopId).toBe('other-shop');
  });

  it('should call switchToHttp and getRequest', () => {
    const getRequest = jest.fn().mockReturnValue({ user: mockTenantContext });
    const switchToHttp = jest.fn().mockReturnValue({ getRequest });
    const ctx = createMock<ExecutionContext>({ switchToHttp });

    tenantFactory(undefined, ctx);

    expect(switchToHttp).toHaveBeenCalled();
    expect(getRequest).toHaveBeenCalled();
  });
});
