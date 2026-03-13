import { AuthService } from './auth.service';
import { AuthOutputDto } from './dto/auth-output.dto';
import { SignInDto } from './dto/sign-in.dto';

import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockSignInDto: SignInDto = {
    id: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-456',
  };

  const mockTokenPayload = {
    sub: mockSignInDto.id,
    email: mockSignInDto.email,
    organizationId: mockSignInDto.organizationId,
  };

  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockToken';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should generate JWT token with correct payload', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockAccessToken);

      const result = await service.signIn(mockSignInDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith(mockTokenPayload);
      expect(result).toEqual({
        email: mockSignInDto.email,
        accessToken: mockAccessToken,
      });
    });

    it('should include organizationId in token payload', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockAccessToken);

      await service.signIn(mockSignInDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockSignInDto.organizationId,
        }),
      );
    });

    it('should return accessToken and email', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockAccessToken);

      const result = await service.signIn(mockSignInDto);

      expect(result).toEqual<AuthOutputDto>({
        email: mockSignInDto.email,
        accessToken: mockAccessToken,
      });
    });

    it('should use the correct sub claim from user id', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockAccessToken);

      await service.signIn(mockSignInDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockSignInDto.id,
        }),
      );
    });
  });
});
