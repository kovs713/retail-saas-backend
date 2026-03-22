import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { ShopService } from '@/modules/shop/shop.service';
import { UserService } from '@/modules/user/user.service';
import { AuthService } from './auth.service';
import { AuthOutputDto } from './dto';

import { createMock } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userService: UserService;
  let shopService: ShopService;
  let cacheService: CacheService;

  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockToken';
  const mockRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshToken';

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'owner',
    shopId: 'shop-456',
  };

  const mockShop = {
    id: 'shop-456',
    ownerId: 'user-123',
    name: 'Test Shop',
    slug: 'test-shop',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
        {
          provide: UserService,
          useValue: createMock<UserService>(),
        },
        {
          provide: ShopService,
          useValue: createMock<ShopService>(),
        },
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
    shopService = module.get<ShopService>(ShopService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    const mockSignInDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return accessToken and email', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(shopService, 'findByOwnerId').mockResolvedValue(mockShop as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockAccessToken);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockRefreshToken);

      const result = await service.signIn(mockSignInDto as any);

      expect(result).toEqual<AuthOutputDto>({
        email: mockSignInDto.email,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userService, 'findByEmail').mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.signIn(mockSignInDto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when password invalid', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(false);

      await expect(service.signIn(mockSignInDto as any)).rejects.toThrow(Error);
    });

    it('should handle shop not found and still return tokens', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(shopService, 'findByOwnerId').mockResolvedValue(null);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockAccessToken);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockRefreshToken);

      const result = await service.signIn(mockSignInDto as any);

      expect(result).toEqual({
        email: mockSignInDto.email,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });
  });

  describe('register', () => {
    const mockRegisterDto = {
      email: 'new@example.com',
      password: 'password123',
      shopName: 'New Shop',
      shopSlug: 'new-shop',
    };

    it('should register user and create shop successfully', async () => {
      const createdUser = { ...mockUser, email: mockRegisterDto.email };
      jest.spyOn(shopService, 'create').mockResolvedValue(mockShop as any);
      jest.spyOn(shopService, 'updateOwner').mockResolvedValue(mockShop as any);
      jest.spyOn(userService, 'create').mockResolvedValue(createdUser as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockAccessToken);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockRefreshToken);

      const result = await service.register(mockRegisterDto as any);

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockRegisterDto.email,
          password: mockRegisterDto.password,
          role: 'owner',
          shopId: mockShop.id,
        }),
      );
      expect(shopService.updateOwner).toHaveBeenCalledWith(mockShop.id, mockUser.id);
      expect(result).toEqual({
        email: mockRegisterDto.email,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should throw ConflictException when shop creation fails', async () => {
      jest.spyOn(shopService, 'create').mockRejectedValue(new ConflictException('Shop slug already exists'));

      await expect(service.register(mockRegisterDto as any)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when user creation fails due to duplicate email', async () => {
      jest.spyOn(shopService, 'create').mockResolvedValue(mockShop as any);
      jest.spyOn(userService, 'create').mockRejectedValue(new ConflictException('Email already exists'));

      await expect(service.register(mockRegisterDto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshToken', () => {
    const mockRefreshTokenString = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshToken';

    it('should return new accessToken and refreshToken', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        shopId: 'shop-456',
        role: 'owner',
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockRefreshTokenString);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);
      jest.spyOn(userService, 'findById').mockResolvedValue(mockUser as any);
      jest.spyOn(shopService, 'findByOwnerId').mockResolvedValue(mockShop as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockAccessToken);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken(mockRefreshTokenString);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockRefreshTokenString);
      expect(result.email).toBe(mockPayload.email);
      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException when refresh token invalid', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(mockRefreshTokenString)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token expired', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Token expired'));

      await expect(service.refreshToken(mockRefreshTokenString)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        shopId: 'shop-456',
        role: 'owner',
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);
      jest.spyOn(userService, 'findById').mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.refreshToken(mockRefreshTokenString)).rejects.toThrow(UnauthorizedException);
    });
  });
});
