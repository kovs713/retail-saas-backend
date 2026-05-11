import { Request, TokenPayload } from '../types';
import { mockAuthGuard, mockGuard } from './guard.util';

import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';

describe('Guard Utils', () => {
  describe('mockGuard', () => {
    const mockContext = createMock<ExecutionContext>();

    it('should create a mock guard that allows access by default', async () => {
      const guard = mockGuard();

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should create a mock guard that allows access when allow is true', async () => {
      const guard = mockGuard(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should create a mock guard that denies access when allow is false', async () => {
      const guard = mockGuard(false);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should return a CanActivate object', () => {
      const guard = mockGuard();

      expect(guard).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });
  });

  describe('mockAuthGuard', () => {
    const mockUser: TokenPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      shopId: 'shop-456',
      role: 'owner',
    };

    it('should create a guard that sets user on request', async () => {
      const guard = mockAuthGuard(mockUser);
      const mockRequest = { user: undefined } as Request & {
        user?: TokenPayload;
      };
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(mockUser);
    });

    it('should return true when canActivate is called', async () => {
      const guard = mockAuthGuard(mockUser);
      const mockRequest = { user: undefined } as Request & {
        user?: TokenPayload;
      };
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should set the complete user payload on request', async () => {
      const guard = mockAuthGuard(mockUser);
      const mockRequest = { user: undefined } as Request & {
        user?: TokenPayload;
      };
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      });

      await guard.canActivate(mockContext);

      expect(mockRequest.user).toEqual({
        sub: 'user-123',
        email: 'test@example.com',
        shopId: 'shop-456',
        role: 'owner',
      });
    });

    it('should work with different user roles', async () => {
      const adminUser: TokenPayload = {
        sub: 'admin-1',
        email: 'admin@example.com',
        shopId: 'shop-1',
        role: 'admin',
      };

      const guard = mockAuthGuard(adminUser);
      const mockRequest = { user: undefined } as Request & {
        user?: TokenPayload;
      };
      const mockContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      });

      await guard.canActivate(mockContext);

      expect(mockRequest.user.role).toBe('admin');
    });
  });
});
