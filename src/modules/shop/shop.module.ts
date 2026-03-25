import { Shop } from './entities';
import { ShopRepository } from './repository';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Shop])],
  providers: [ShopService, ShopRepository],
  exports: [ShopService],
  controllers: [ShopController],
})
export class ShopModule {}
