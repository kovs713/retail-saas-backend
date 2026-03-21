import { UserModule } from '@/modules/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { ShopModule } from '@/app/modules/shop/shop.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [UserModule, ShopModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
