import { ProductModule } from '@/modules/product/product.module';
import { Location, Shop } from './entities';
import { PublicShopController } from './public-shop.controller';
import { LocationRepository, ShopRepository } from './repositories';
import { ShopController } from './shop.controller';
import { ShopStorageController } from './shop-storage.controller';
import { ShopService } from './shop.service';

import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shop, Location]),
    forwardRef(() => ProductModule),
  ],
  providers: [ShopService, ShopRepository, LocationRepository],
  exports: [ShopService, ShopRepository],
  controllers: [ShopController, PublicShopController, ShopStorageController],
})
export class ShopModule {}
