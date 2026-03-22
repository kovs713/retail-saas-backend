import { Request, TokenPayload } from '../types';

import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';

describe('User Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  const mockUser: TokenPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'owner',
    shopId: 'shop-1',
  };

  beforeEach(() => {
    mockRequest = {
      user: mockUser,
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
    const decoratorFactory = (data: unknown, ctx: ExecutionContext): TokenPayload => {
      const request = ctx.switchToHttp().getRequest<Request>();
      return request.user;
    };

    it('should extract user from request context', () => {
      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result).toEqual(mockUser);
      expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
    });

    it('should return user with all required properties', () => {
      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('owner');
      expect(result.shopId).toBe('shop-1');
    });

    it('should handle different roles', () => {
      mockRequest.user = {
        sub: 'admin-1',
        email: 'admin@example.com',
        role: 'super_admin',
        shopId: 'shop-1',
      };

      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result.role).toBe('super_admin');
      expect(result.shopId).toBe('shop-1');
    });

    it('should return user object reference', () => {
      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result).toBe(mockRequest.user);
    });

    it('should work with ExecutionContext context switch', () => {
      const mockHttpHost = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
      };

      const mockContext = createMock<ExecutionContext>({
        switchToHttp: jest.fn().mockReturnValue(mockHttpHost),
      });

      const result = decoratorFactory(undefined, mockContext);

      expect(result).toEqual(mockUser);
      expect(mockContext.switchToHttp).toHaveBeenCalled();
      expect(mockHttpHost.getRequest).toHaveBeenCalled();
    });
  });
});
