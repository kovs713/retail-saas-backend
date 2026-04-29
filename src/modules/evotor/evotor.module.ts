import { ProductModule } from '@/modules/product/product.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { EvotorIntegration } from './entities';
import { EvotorApiModule } from './evotor-api.module';
import { EvotorController } from './evotor.controller';
import { EvotorService } from './evotor.service';
import { EvotorIntegrationRepository } from './repositories';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([EvotorIntegration]),
    EvotorApiModule.forRoot(),
    ProductModule,
    ShopModule,
  ],
  providers: [EvotorService, EvotorIntegrationRepository],
  exports: [EvotorService, EvotorIntegrationRepository],
  controllers: [EvotorController],
})
export class EvotorModule {}
