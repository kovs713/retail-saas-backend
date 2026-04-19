import { AuthGuard, RolesGuard } from './guards';
import { JwtOptions, JwtConfig } from './types';

import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [JwtConfig],
      useFactory: (jwtConfig: JwtOptions) => ({
        secret: jwtConfig.secret,
        signOptions: {
          expiresIn: jwtConfig.expiresIn,
        },
      }),
    }),
  ],
  providers: [
    {
      provide: JwtConfig,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: configService.getOrThrow<StringValue>('JWT_EXPIRED_TIME', '1d'),
      }),
    },
    AuthGuard,
    RolesGuard,
  ],
  exports: [AuthGuard, RolesGuard, JwtConfig, JwtModule],
})
export class CommonModule {}
