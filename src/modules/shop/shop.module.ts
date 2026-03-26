import { Shop } from './entities';
import { ShopRepository } from './repository';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { Order } from './entities/order.entity';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, Order])],
  providers: [ShopService, ShopRepository],
  exports: [ShopService],
  controllers: [ShopController],
})
export class ShopModule {}
