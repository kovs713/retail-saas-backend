import { AuthOutputDto } from './dto/auth-output.dto';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/sign-in.dto';
import { TokenPayload } from './types/token-payload.type';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@/modules/user/user.service';
import { ShopService } from '@/modules/shop/shop.service';

@Injectable()
export class AuthService {
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
      ownerId: '',
    });

    const user = await this.userService.create({
      email: registerDto.email,
      password: registerDto.password,
      role: 'owner',
      shopId: shop.id,
    });

    shop.ownerId = user.id;
    await this.shopService.update(shop.id, {});

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      shopId: shop.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      email: user.email,
      accessToken: accessToken,
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

    return {
      email: user.email,
      accessToken: accessToken,
    };
  }
}
