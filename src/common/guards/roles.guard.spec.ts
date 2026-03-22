import { Role } from '../enums';
import { Request } from '../types';
import { RolesGuard } from './roles.guard';

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mockContext: ExecutionContext;
  let mockRequest: Request;

  beforeEach(() => {
    reflector = new Reflector();
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as JwtService;
    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    guard = new RolesGuard(reflector, jwtService, configService);

    mockRequest = {
      headers: {},
      user: undefined,
    } as unknown as Request;

    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
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
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
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
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER, Role.EMPLOYEE]);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
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
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SUPER_ADMIN]);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        email: 'test@example.com',
        role: Role.OWNER,
        shopId: 'shop-1',
      });

      mockRequest.headers.authorization = 'Bearer valid-token';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Insufficient permissions');
    });

    it('should throw ForbiddenException when token is missing', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      mockRequest.headers.authorization = undefined;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Missing token');
    });

    it('should throw ForbiddenException when token verification fails', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      const forbiddenError = new ForbiddenException('Invalid token');
      jest.spyOn(jwtService, 'verifyAsync').mockImplementation(() => {
        throw forbiddenError;
      });
      mockRequest.headers.authorization = 'Bearer invalid-token';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when authorization header format is wrong', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      mockRequest.headers.authorization = 'InvalidFormat';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Missing token');
    });

    it('should throw ForbiddenException when token type is not Bearer', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
      mockRequest.headers.authorization = 'Basic some-token';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Missing token');
    });
  });
});
