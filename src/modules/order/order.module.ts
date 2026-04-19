import { ProductModule } from '@/modules/product/product.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { AdminOrderController } from './admin-order.controller';
import { Order } from './entities';
import { OrderService } from './order.service';
import { PublicOrderController } from './public-order.controller';
import { OrderRepository } from './repositories';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), ShopModule, ProductModule],
  providers: [OrderService, OrderRepository],
  exports: [OrderService, OrderRepository],
  controllers: [PublicOrderController, AdminOrderController],
})
export class OrderModule {}
