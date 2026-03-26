import { ShopModule } from '@/modules/shop/shop.module';
import { AdminOrderController } from './admin-order.controller';
import { Order } from './order.entity';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { PublicOrderController } from './public-order.controller';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), ShopModule],
  providers: [OrderService, OrderRepository],
  exports: [OrderService],
  controllers: [PublicOrderController, AdminOrderController],
})
export class OrderModule {}
