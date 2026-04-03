import { ShopModule } from '@/modules/shop/shop.module';
import { UserModule } from '@/modules/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { AuthConfig } from '@/common/types';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AuthOptions {
  refreshTokenCookie: string;
  refreshTokenMaxAge: number;
}

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    return {
      module: AuthModule,
      imports: [UserModule, ShopModule],
      providers: [
        {
          provide: AuthConfig,
          inject: [ConfigService],
          useFactory: (configService: ConfigService): AuthOptions => ({
            refreshTokenCookie: configService.getOrThrow<string>('REFRESH_TOKEN_COOKIE'),
            refreshTokenMaxAge: configService.getOrThrow<number>('REFRESH_TOKEN_MAX_AGE'),
          }),
        },

        AuthService,
      ],
      exports: [AuthService],
      controllers: [AuthController],
    };
  }
}
