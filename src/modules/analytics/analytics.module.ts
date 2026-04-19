import { Module } from '@nestjs/common';
import { OrderModule } from '@/modules/order/order.module';
import { ProductModule } from '@/modules/product/product.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ChatEvent, StorefrontView } from './entities';
import { AnalyticsRepository } from './repositories';

@Module({
  imports: [TypeOrmModule.forFeature([ChatEvent, StorefrontView]), ProductModule, OrderModule],
  providers: [AnalyticsService, AnalyticsRepository],
  exports: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
