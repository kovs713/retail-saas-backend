import { AuthConfig, AuthOptions, TokenPayload } from '@/common/types';
import { CacheService } from '@/core/cache/cache.service';
import { RegistrationApplicationService } from '@/modules/registration-application/registration-application.service';
import { ShopService } from '@/modules/shop/shop.service';
import { UserService } from '@/modules/user/user.service';
import {
  AuthResponseDto,
  RegisterApplicationResponseDto,
  RegisterDto,
  SignInDto,
  UserInfoDto,
} from './dto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';

export type AuthTokensResult = AuthResponseDto & { refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthConfig)
    private readonly authConfig: AuthOptions,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly shopService: ShopService,
    private readonly cacheService: CacheService,
    private readonly registrationApplicationService: RegistrationApplicationService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<RegisterApplicationResponseDto> {
    const application =
      await this.registrationApplicationService.create(registerDto);

    return {
      id: application.id,
      email: application.email,
      shopName: application.shopName,
      shopSlug: application.shopSlug,
      status: application.status,
    };
  }

  async signIn(signInDto: SignInDto): Promise<AuthTokensResult> {
    const user = await this.userService.findByEmail(signInDto.email);

    const isValid = await this.userService.validatePassword(
      user,
      signInDto.password,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const shop = await this.shopService.findByOwnerId(user.id);

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      shopId: shop?.id || '',
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);
    const refreshToken = await this.jwtService.signAsync(tokenPayload, {
      expiresIn: '7d',
    });

    await this.cacheService.set(
      this.cacheService.generateKey(
        this.authConfig.refreshTokenCookie,
        user.id,
      ),
      refreshToken,
      this.authConfig.refreshTokenMaxAge,
    );

    return {
      accessToken,
      refreshToken,
      user: plainToInstance(
        UserInfoDto,
        { ...user, shopId: shop?.id || '' },
        { excludeExtraneousValues: true },
      ),
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokensResult> {
    try {
      const payload =
        await this.jwtService.verifyAsync<TokenPayload>(refreshToken);

      const storedToken = await this.cacheService.get<string>(
        this.cacheService.generateKey(
          this.authConfig.refreshTokenCookie,
          payload.sub,
        ),
      );

      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.userService.findById(payload.sub);
      const shop = await this.shopService.findByOwnerId(user.id);

      const newTokenPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
        shopId: shop?.id || '',
        role: user.role,
      };

      const newAccessToken = await this.jwtService.signAsync(newTokenPayload);
      const newRefreshToken = await this.jwtService.signAsync(newTokenPayload, {
        expiresIn: '7d',
      });

      await this.cacheService.set(
        this.cacheService.generateKey(
          this.authConfig.refreshTokenCookie,
          user.id,
        ),
        newRefreshToken,
        this.authConfig.refreshTokenMaxAge,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: plainToInstance(
          UserInfoDto,
          { ...user, shopId: shop?.id || '' },
          { excludeExtraneousValues: true },
        ),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string): Promise<UserInfoDto> {
    const user = await this.userService.findById(userId);
    const shop = await this.shopService.findByOwnerId(user.id);

    return plainToInstance(
      UserInfoDto,
      { ...user, shopId: shop?.id || '' },
      { excludeExtraneousValues: true },
    );
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.cacheService.del(
      this.cacheService.generateKey(this.authConfig.refreshTokenCookie, userId),
    );
  }
}
