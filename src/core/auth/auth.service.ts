import { AuthConfig, TokenPayload } from '@/common/types';
import { CacheService } from '@/core/cache/cache.service';
import { Shop } from '@/modules/shop/entities';
import { ShopService } from '@/modules/shop/shop.service';
import { User } from '@/modules/user/entities';
import { UserService } from '@/modules/user/user.service';
import { AuthResponseDto, RegisterDto, SignInDto, UserInfoDto } from './dto';

import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';
import { AuthOptions } from './auth.module';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthConfig)
    private readonly authConfig: AuthOptions,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly shopService: ShopService,
    private readonly cacheService: CacheService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const { shop, user } = await this.dataSource.transaction(async (manager) => {
        const shopRepository = manager.getRepository(Shop);
        const userRepository = manager.getRepository(User);

        const shop = await shopRepository.save(
          shopRepository.create({
            name: registerDto.shopName,
            slug: registerDto.shopSlug,
            description: registerDto.shopDescription ?? null,
            address: registerDto.shopAddress ?? null,
            phone: registerDto.shopPhone ?? null,
            workingHours: registerDto.shopWorkingHours ?? null,
            isActive: registerDto.isActive ?? true,
          }),
        );

        const passwordHash = await hash(registerDto.password, 10);
        const user = await userRepository.save(
          userRepository.create({
            email: registerDto.email,
            passwordHash,
            role: 'owner',
            shopId: shop.id,
          }),
        );

        shop.ownerId = user.id;
        const updatedShop = await shopRepository.save(shop);

        return { shop: updatedShop, user };
      });

      const tokenPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
        shopId: shop.id,
        role: user.role,
      };

      const accessToken = await this.jwtService.signAsync(tokenPayload);
      const refreshToken = await this.jwtService.signAsync(tokenPayload, { expiresIn: '7d' });

      await this.cacheService.set(
        this.cacheService.generateKey(this.authConfig.refreshTokenCookie, user.id),
        refreshToken,
        this.authConfig.refreshTokenMaxAge,
      );

      return {
        accessToken,
        refreshToken,
        user: plainToInstance(UserInfoDto, { ...user, shopId: shop.id }, { excludeExtraneousValues: true }),
      };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email or shop slug already exists');
      }
      throw error;
    }
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
      this.cacheService.generateKey(this.authConfig.refreshTokenCookie, user.id),
      refreshToken,
      this.authConfig.refreshTokenMaxAge,
    );

    return {
      accessToken,
      refreshToken,
      user: plainToInstance(UserInfoDto, { ...user, shopId: shop?.id || '' }, { excludeExtraneousValues: true }),
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken);

      const storedToken = await this.cacheService.get<string>(
        this.cacheService.generateKey(this.authConfig.refreshTokenCookie, payload.sub),
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
        this.cacheService.generateKey(this.authConfig.refreshTokenCookie, user.id),
        refreshToken,
        this.authConfig.refreshTokenMaxAge,
      );

      return {
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
    await this.cacheService.del(this.cacheService.generateKey(this.authConfig.refreshTokenCookie, userId));
  }

  private isUniqueConstraintError(error: unknown): error is { driverError?: { code?: string } } {
    if (typeof error !== 'object' || error === null || !('driverError' in error)) {
      return false;
    }

    const driverError = (error as { driverError?: { code?: string } }).driverError;
    return driverError?.code === '23505';
  }
}
