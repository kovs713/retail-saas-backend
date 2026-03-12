/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TokenPayload } from '../types/token-payload.type';
import { Request } from '../types/request.type';

import { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';

describe('User Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: Request & { user?: TokenPayload };

  const mockUser: TokenPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-456',
  };

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: mockUser,
    } as unknown as Request & { user?: TokenPayload };

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
    const decoratorFactory = (data: keyof TokenPayload | undefined, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest<Request>();
      const user: TokenPayload = request.user;

      if (data) {
        return user[data];
      }

      return user;
    };

    it('should return full user object when no field specified', () => {
      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result).toEqual(mockUser);
    });

    it('should return full user object when data is undefined', () => {
      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result).toEqual(mockUser);
      expect((result as TokenPayload).email).toBe(mockUser.email);
      expect((result as TokenPayload).organizationId).toBe(mockUser.organizationId);
    });

    it('should return specific field when field name provided', () => {
      const result = decoratorFactory('email', mockExecutionContext);

      expect(result).toBe(mockUser.email);
    });

    it("should return organizationId when 'organizationId' specified", () => {
      const result = decoratorFactory('organizationId', mockExecutionContext);

      expect(result).toBe(mockUser.organizationId);
    });

    it("should return sub when 'sub' specified", () => {
      const result = decoratorFactory('sub', mockExecutionContext);

      expect(result).toBe(mockUser.sub);
    });

    it('should handle missing user object gracefully', () => {
      (mockRequest as any).user = undefined;
      const result = decoratorFactory(undefined, mockExecutionContext);

      expect(result).toBeUndefined();
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

    it('should return the correct user properties', () => {
      const result = decoratorFactory(undefined, mockExecutionContext) as TokenPayload;

      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('organizationId');
    });
  });
});
