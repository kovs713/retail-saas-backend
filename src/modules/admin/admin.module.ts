import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { EvotorModule } from '@/modules/evotor/evotor.module';
import { OrderModule } from '@/modules/order/order.module';
import { ProductModule } from '@/modules/product/product.module';
import { RagModule } from '@/modules/rag/rag.module';
import { RegistrationApplication } from '@/modules/registration-application/entities';
import { RegistrationApplicationModule } from '@/modules/registration-application/registration-application.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistrationApplication]),
    ShopModule,
    ProductModule,
    EvotorModule,
    RagModule.forRoot(),
    AnalyticsModule,
    OrderModule,
    RegistrationApplicationModule,
  ],
  providers: [AdminDashboardService],
  controllers: [AdminDashboardController],
})
export class AdminModule {}
