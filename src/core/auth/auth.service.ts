import { TokenPayload } from '@/common/types';
import { CacheService } from '@/core/cache/cache.service';
import { ShopService } from '@/modules/shop/shop.service';
import { UserService } from '@/modules/user/user.service';
import { AuthResponseDto, RegisterDto, SignInDto, UserInfoDto } from './dto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_PREFIX = 'auth:refresh';
  private readonly REFRESH_TOKEN_TTL = 604800;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly shopService: ShopService,
    private readonly cacheService: CacheService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const shop = await this.shopService.create({
      name: registerDto.shopName,
      slug: registerDto.shopSlug,
      description: registerDto.shopDescription ?? undefined,
      address: registerDto.shopAddress ?? undefined,
      phone: registerDto.shopPhone ?? undefined,
      workingHours: registerDto.shopWorkingHours ?? undefined,
      isActive: registerDto.isActive ?? true,
    });

    const user = await this.userService.create({
      email: registerDto.email,
      password: registerDto.password,
      role: 'owner',
      shopId: shop.id,
    });

    await this.shopService.updateOwner(shop.id, user.id);

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      shopId: shop.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);
    const refreshToken = await this.jwtService.signAsync(tokenPayload, { expiresIn: '7d' });

    await this.cacheService.set(
      this.cacheService.generateKey(this.REFRESH_TOKEN_PREFIX, user.id),
      refreshToken,
      this.REFRESH_TOKEN_TTL,
    );

    return {
      email: user.email,
      accessToken,
      refreshToken,
      user: plainToInstance(UserInfoDto, { ...user, shopId: shop.id }, { excludeExtraneousValues: true }),
    };
  }

  async signIn(signInDto: SignInDto): Promise<AuthResponseDto> {
    const user = await this.userService.findByEmail(signInDto.email);

    const isValid = await this.userService.validatePassword(user, signInDto.password);

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
    const refreshToken = await this.jwtService.signAsync(tokenPayload, { expiresIn: '7d' });

    await this.cacheService.set(
      this.cacheService.generateKey(this.REFRESH_TOKEN_PREFIX, user.id),
      refreshToken,
      this.REFRESH_TOKEN_TTL,
    );

    return {
      email: user.email,
      accessToken,
      refreshToken,
      user: plainToInstance(UserInfoDto, { ...user, shopId: shop?.id || '' }, { excludeExtraneousValues: true }),
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken);

      const storedToken = await this.cacheService.get<string>(
        this.cacheService.generateKey(this.REFRESH_TOKEN_PREFIX, payload.sub),
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
      const newRefreshToken = await this.jwtService.signAsync(newTokenPayload, { expiresIn: '7d' });

      await this.cacheService.set(
        this.cacheService.generateKey(this.REFRESH_TOKEN_PREFIX, user.id),
        newRefreshToken,
        this.REFRESH_TOKEN_TTL,
      );

      return {
        email: user.email,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: plainToInstance(UserInfoDto, { ...user, shopId: shop?.id || '' }, { excludeExtraneousValues: true }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string): Promise<UserInfoDto> {
    const user = await this.userService.findById(userId);
    const shop = await this.shopService.findByOwnerId(user.id);

    return plainToInstance(UserInfoDto, { ...user, shopId: shop?.id || '' }, { excludeExtraneousValues: true });
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.cacheService.del(this.cacheService.generateKey(this.REFRESH_TOKEN_PREFIX, userId));
  }
}
