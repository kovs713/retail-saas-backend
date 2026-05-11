import { Role } from '../enums';
import { JwtOptions, Request } from '../types';
import { RolesGuard } from './roles.guard';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let jwtService: DeepMocked<JwtService>;
  let mockContext: ExecutionContext;
  let mockRequest: Request & { user?: unknown };

  const mockJwtConfig: JwtOptions = {
    secret: 'test-secret',
    expiresIn: '1d',
  };

  beforeEach(() => {
    reflector = new Reflector();
    jwtService = createMock<JwtService>();

    guard = new RolesGuard(reflector, jwtService, mockJwtConfig);

    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should return true when user has required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      jwtService.verifyAsync.mockResolvedValue({
        email: 'test@example.com',
        role: Role.OWNER,
        shopId: 'shop-1',
      });

      mockRequest.headers.authorization = 'Bearer valid-token';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(
        expect.objectContaining({
          email: 'test@example.com',
          role: Role.OWNER,
          shopId: 'shop-1',
        }),
      );
    });

    it('should return true when user has one of multiple required roles', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.OWNER, Role.EMPLOYEE]);
      jwtService.verifyAsync.mockResolvedValue({
        email: 'test@example.com',
        role: Role.EMPLOYEE,
        shopId: 'shop-1',
      });

      mockRequest.headers.authorization = 'Bearer valid-token';

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(
        expect.objectContaining({
          email: 'test@example.com',
          role: Role.EMPLOYEE,
        }),
      );
    });

    it('should throw ForbiddenException when user lacks required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      jwtService.verifyAsync.mockResolvedValue({
        email: 'test@example.com',
        role: Role.OWNER,
        shopId: 'shop-1',
      });

      mockRequest.headers.authorization = 'Bearer valid-token';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Insufficient permissions',
      );
    });

    it('should throw ForbiddenException when token is missing', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      mockRequest.headers.authorization = undefined;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Missing token',
      );
    });

    it('should throw ForbiddenException when token verification fails', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      const forbiddenError = new ForbiddenException('Invalid token');
      jwtService.verifyAsync.mockImplementation(() => {
        throw forbiddenError;
      });
      mockRequest.headers.authorization = 'Bearer invalid-token';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when authorization header format is wrong', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      mockRequest.headers.authorization = 'InvalidFormat';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Missing token',
      );
    });

    it('should throw ForbiddenException when token type is not Bearer', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      mockRequest.headers.authorization = 'Basic some-token';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Missing token',
      );
    });
  });
});
