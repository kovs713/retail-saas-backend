import { AuthGuard, RolesGuard } from './guards';

import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<StringValue>('JWT_EXPIRED_TIME', '1d'),
        },
      }),
    }),
  ],
  providers: [AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard, JwtModule],
})
export class CommonModule {}
