import { TokenPayload } from '@/common/types';
import { ShopService } from '@/modules/shop/shop.service';
import { UserService } from '@/modules/user/user.service';
import { AuthOutputDto, RegisterDto, SignInDto } from './dto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly refreshTokens: Map<string, string> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly shopService: ShopService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthOutputDto> {
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

    this.refreshTokens.set(user.id, refreshToken);

    return {
      email: user.email,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async signIn(signInDto: SignInDto): Promise<AuthOutputDto> {
    const user = await this.userService.findByEmail(signInDto.email);

    const isValid = await this.userService.validatePassword(user, signInDto.password);

    if (!isValid) {
      throw new Error('Invalid credentials');
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

    this.refreshTokens.set(user.id, refreshToken);

    return {
      email: user.email,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthOutputDto> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken);

      const storedToken = this.refreshTokens.get(payload.sub);

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

      this.refreshTokens.set(user.id, newRefreshToken);

      return {
        email: user.email,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
