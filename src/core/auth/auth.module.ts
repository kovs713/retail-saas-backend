import { AuthConfig, AuthOptions } from '@/common/types';
import { RegistrationApplicationModule } from '@/modules/registration-application/registration-application.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { UserModule } from '@/modules/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    return {
      module: AuthModule,
      imports: [UserModule, ShopModule, RegistrationApplicationModule],
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
