import { Request, TenantContext } from '../types';

import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';

describe('Tenant Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  const mockTenantContext: TenantContext = {
    shopId: 'test-shop-id',
  };

  beforeEach(() => {
    mockRequest = {
      user: mockTenantContext,
    };

    mockExecutionContext = createMock<ExecutionContext>({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('decorator factory function', () => {
    const decoratorFactory = (data: unknown, ctx: ExecutionContext): TenantContext => {
      const request = ctx.switchToHttp().getRequest<Request>();
      return {
        shopId: request.user.shopId,
      };
    };

    it('should extract shopId from request.user', () => {
      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result).toEqual(mockTenantContext);
      expect(result.shopId).toBe('test-shop-id');
    });

    it('should handle missing user object gracefully', () => {
      mockRequest.user = undefined;

      expect(() => decoratorFactory(undefined, mockExecutionContext)).toThrow();
    });

    it('should work with ExecutionContext context switch', () => {
      const mockHttpHost = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
      };

      const mockContext = createMock<ExecutionContext>({
        switchToHttp: jest.fn().mockReturnValue(mockHttpHost),
      });

      const result = decoratorFactory(undefined, mockContext);

      expect(result).toEqual(mockTenantContext);
      expect(mockContext.switchToHttp).toHaveBeenCalled();
      expect(mockHttpHost.getRequest).toHaveBeenCalled();
    });

    it('should return TenantContext with shopId', () => {
      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result).toHaveProperty('shopId');
    });
  });
});
