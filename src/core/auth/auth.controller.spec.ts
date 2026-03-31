import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResponseDto, RegisterDto, SignInDto, UserInfoDto } from './dto';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: DeepMocked<AuthService>;

  const mockUserInfo: UserInfoDto = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'owner',
    shopId: 'shop-456',
    isActive: true,
  };

  const mockAuthResponse: AuthResponseDto = {
    email: 'test@example.com',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: mockUserInfo,
  };

  const mockResponse = () => {
    const cookies: Record<string, string> = {};
    const res = { cookies, cookie: jest.fn() };
    res.cookie.mockImplementation((name: string, value: string) => {
      cookies[name] = value;
      return res;
    });
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AuthService, useValue: createMock<AuthService>() },
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
      ],
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
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

      authService.register.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      const result = await controller.register(registerDto, res);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
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

      authService.signIn.mockResolvedValue(mockAuthResponse);
      const res = mockResponse();

      const result = await controller.login(signInDto, res);

      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
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

      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(req, res);

      expect(authService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
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
      const req: any = {
        user: { sub: 'user-123', email: 'test@example.com', shopId: 'shop-456', role: 'owner' },
      };

      authService.getProfile.mockResolvedValue(mockUserInfo);

      const result = await controller.me(req);

      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        success: true,
        data: mockUserInfo,
      });
    });
  });
});
