import { AuthService } from './auth.service';
import { AuthOutputDto } from './dto/auth-output.dto';

import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '@/modules/user/user.service';
import { ShopService } from '@/modules/shop/shop.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userService: UserService;
  let shopService: ShopService;

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
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            validatePassword: jest.fn(),
          },
        },
        {
          provide: ShopService,
          useValue: {
            create: jest.fn(),
            findByOwnerId: jest.fn(),
            updateOwner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
    shopService = module.get<ShopService>(ShopService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should return accessToken and email', async () => {
      const mockSignInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

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
  });
});
