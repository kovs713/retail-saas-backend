import { ProductModule } from '@/modules/product/product.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { EvotorApiModule } from './evotor-api.module';
import { EvotorController } from './evotor.controller';
import { EvotorIntegration } from './entities/evotor-integration.entity';
import { EvotorService } from './evotor.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([EvotorIntegration]), EvotorApiModule.forRoot(), ProductModule, ShopModule],
  controllers: [EvotorController],
  providers: [EvotorService],
  exports: [EvotorService],
})
export class EvotorModule {}
