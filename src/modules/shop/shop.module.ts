import { ProductModule } from '@/modules/product/product.module';
import { Location, Shop } from './entities';
import { PublicShopController } from './public-shop.controller';
import { LocationRepository, ShopRepository } from './repositories';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, Location]), ProductModule],
  providers: [ShopService, ShopRepository, LocationRepository],
  exports: [ShopService],
  controllers: [ShopController, PublicShopController],
})
export class ShopModule {}
