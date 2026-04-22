import { JwtOptions, Request, TokenPayload } from '../types';
import { AuthGuard } from './auth.guard';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: DeepMocked<JwtService>;
  let mockExecutionContext: ExecutionContext;

  const mockTokenPayload: TokenPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    shopId: 'shop-456',
    role: 'owner',
  };

  const mockSecret = 'test-secret-key';
  const mockJwtConfig: JwtOptions = {
    secret: mockSecret,
    expiresIn: '1d',
  };

  beforeEach(() => {
    jwtService = createMock<JwtService>();
    guard = new AuthGuard(jwtService, mockJwtConfig);

    mockExecutionContext = createMock<ExecutionContext>();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access with valid Bearer token', async () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer test-token`,
        },
      } as Request;

      mockExecutionContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });
      jwtService.verifyAsync.mockResolvedValue(mockTokenPayload);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for missing Authorization header', async () => {
      const mockRequest = {
        headers: {},
      } as Request;

      mockExecutionContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as Request;

      mockExecutionContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });
      jwtService.verifyAsync.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
    });

    it('should throw UnauthorizedException for non-Bearer token type', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Basic some-token',
        },
      } as Request;

      mockExecutionContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should attach user payload to request', async () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer test-token`,
        },
      } as Request & { user?: TokenPayload };

      mockExecutionContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });
      jwtService.verifyAsync.mockResolvedValue(mockTokenPayload);

      await guard.canActivate(mockExecutionContext);

      expect(mockRequest.user).toEqual(mockTokenPayload);
    });

    it('should throw UnauthorizedException for malformed Authorization header', async () => {
      const mockRequest = {
        headers: {
          authorization: 'malformed',
        },
      } as Request;

      mockExecutionContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for empty Authorization header', async () => {
      const mockRequest = {
        headers: {
          authorization: '',
        },
      } as Request;

      mockExecutionContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer expired-token`,
        },
      } as Request;

      mockExecutionContext.switchToHttp.mockReturnValue({
        getRequest: () => mockRequest,
      });
      jwtService.verifyAsync.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
    });
  });
});
