import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { ProductModule } from '@/modules/product/product.module';
import { Shop } from './entities';
import { PublicShopController } from './public-shop.controller';
import { ShopRepository } from './repository';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Shop]), ProductModule, AnalyticsModule],
  providers: [ShopService, ShopRepository],
  exports: [ShopService],
  controllers: [ShopController, PublicShopController],
})
export class ShopModule {}
