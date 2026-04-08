import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { AuthConfig } from '@/common/types';
import { Shop } from '@/modules/shop/entities';
import { ShopService } from '@/modules/shop/shop.service';
import { User } from '@/modules/user/entities';
import { UserService } from '@/modules/user/user.service';
import { AuthService, AuthTokensResult } from './auth.service';

import { createMock } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, Repository } from 'typeorm';

describe('AuthService', () => {
  let service: AuthService;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let userService: UserService;
  let shopService: ShopService;
  let cacheService: CacheService;

  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockToken';

  const mockRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshToken';

  const mockAuthConfig = {
    refreshTokenCookie: 'refreshToken',
    refreshTokenMaxAge: 604800000,
  };

  const mockShop = {
    id: 'shop-456',
    ownerId: 'user-123',
    name: 'Test Shop',
    slug: 'test-shop',
  } as Shop;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'owner',
    shopId: 'shop-456',
    isActive: true,
    shop: mockShop,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const expectedUserInfo = {
    id: mockUser.id,
    email: mockUser.email,
    role: mockUser.role,
    shopId: mockShop.id,
    isActive: mockUser.isActive,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthConfig,
          useValue: mockAuthConfig,
        },
        {
          provide: DataSource,
          useValue: createMock<DataSource>(),
        },
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
    dataSource = module.get<DataSource>(DataSource);
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

    it('should return accessToken and user info', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(shopService, 'findByOwnerId').mockResolvedValue(mockShop as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockAccessToken);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockRefreshToken);

      const result = await service.signIn(mockSignInDto as any);

      expect(result).toEqual<AuthTokensResult>({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: expectedUserInfo,
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

      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.shopId).toBe('');
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
      const createdUser = { ...mockUser, email: mockRegisterDto.email, id: mockUser.id };
      const createdShop = { ...mockShop, ownerId: createdUser.id };

      const shopRepository = createMock<Repository<Shop>>({
        create: jest.fn().mockImplementation((value: Shop) => value),
        save: jest.fn().mockResolvedValueOnce(mockShop).mockResolvedValueOnce(createdShop),
      });

      const userRepository = createMock<Repository<User>>({
        create: jest.fn().mockImplementation((value: Shop) => value),
        save: jest.fn().mockResolvedValue(createdUser),
      });

      const mockEntityManager = createMock<EntityManager>({
        getRepository: jest.fn().mockReturnValueOnce(shopRepository).mockReturnValueOnce(userRepository),
      });

      jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation((handler: (em: EntityManager) => Promise<unknown>) => handler(mockEntityManager));
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockAccessToken);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockRefreshToken);

      const result = await service.register(mockRegisterDto);

      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw ConflictException when transaction hits unique constraint', async () => {
      jest.spyOn(dataSource, 'transaction').mockRejectedValue(
        Object.assign(new Error('duplicate key'), {
          driverError: { code: '23505' },
        }),
      );

      await expect(service.register(mockRegisterDto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshToken', () => {
    const mockRefreshTokenString = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshToken';

    it('should return new accessToken, refreshToken, and user info', async () => {
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

      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(cacheService.set).toHaveBeenCalledWith(
        cacheService.generateKey('refreshToken', 'user-123'),
        'new-refresh-token',
        604800000,
      );
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

  describe('getProfile', () => {
    it('should return user info', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(mockUser as any);
      jest.spyOn(shopService, 'findByOwnerId').mockResolvedValue(mockShop as any);

      const result = await service.getProfile('user-123');

      expect(result).toEqual(expectedUserInfo);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userService, 'findById').mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty shopId when user has no shop', async () => {
      const userWithoutShop = { ...mockUser, shopId: null };
      jest.spyOn(userService, 'findById').mockResolvedValue(userWithoutShop as any);
      jest.spyOn(shopService, 'findByOwnerId').mockResolvedValue(null);

      const result = await service.getProfile('user-123');

      expect(result.shopId).toBe('');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should delete refresh token from cache', async () => {
      await service.revokeRefreshToken('user-123');

      expect(cacheService.del).toHaveBeenCalledWith(cacheService.generateKey('refreshToken', 'user-123'));
    });
  });
});
