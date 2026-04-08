import { AuthController } from './auth.controller';
import { AuthConfig } from '@/common/types';
import { AuthService } from './auth.service';
import { AuthResponseDto, RegisterDto, SignInDto, UserInfoDto } from './dto';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: DeepMocked<AuthService>;

  const mockAuthConfig = {
    refreshTokenCookie: 'refreshToken',
    refreshTokenMaxAge: 604800000,
  };

  const mockUserInfo: UserInfoDto = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'owner',
    shopId: 'shop-456',
    isActive: true,
  };

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: mockUserInfo,
  };

  const mockResponse = () => {
    const cookies: Record<string, string> = {};
    const res = createMock<Response>();
    res.cookie.mockImplementation((name: string, value: string) => {
      cookies[name] = value;
      return res;
    });
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AuthConfig, useValue: mockAuthConfig },
        { provide: AuthService, useValue: createMock<AuthService>() },
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
      ],
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and return success response', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        shopName: 'Test Shop',
        shopSlug: 'test-shop',
      };

      service.register.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      const result = await controller.register(registerDto, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: 'User registered successfully',
      });
    });
  });

  describe('login', () => {
    it('should login and return success response with user', async () => {
      const signInDto: SignInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      service.signIn.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      const result = await controller.login(signInDto, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: 'Login successful',
      });
      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.id).toBe('user-123');
    });
  });

  describe('refresh', () => {
    it('should refresh token from cookie and return success response', async () => {
      const req: any = {
        headers: {
          cookie: 'refreshToken=old-refresh-token',
        },
      };
      const res = mockResponse();

      service.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: 'Token refreshed successfully',
      });
    });

    it('should throw UnauthorizedException when no refresh token cookie', async () => {
      const req: any = { headers: {} };
      const res = mockResponse();

      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('should return current user profile', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com', shopId: 'shop-456', role: 'owner' };

      service.getProfile.mockResolvedValue(mockUserInfo);

      const result = await controller.me(payload);

      expect(service.getProfile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        success: true,
        data: mockUserInfo,
      });
    });
  });
});
