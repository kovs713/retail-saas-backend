import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResponseDto, RefreshTokenDto, RegisterDto, SignInDto } from './dto';

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: ReturnType<typeof createMock<AuthService>>;

  const mockAuthResponse: AuthResponseDto = {
    email: 'test@example.com',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: createMock<AuthService>() }],
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

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: 'User registered successfully',
      });
    });
  });

  describe('login', () => {
    it('should login and return success response', async () => {
      const signInDto: SignInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.signIn.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(signInDto);

      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: 'Login successful',
      });
    });
  });

  describe('refresh', () => {
    it('should refresh token and return success response', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'old-refresh-token',
      };

      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: 'Token refreshed successfully',
      });
    });
  });
});
