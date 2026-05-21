import { OrderModule } from '@/modules/order/order.module';
import { ProductModule } from '@/modules/product/product.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { UserModule } from '@/modules/user/user.module';
import { EvotorApplication, EvotorIntegration } from './entities';
import { EvotorAdminController } from './evotor-admin.controller';
import { EvotorApiModule } from './evotor-api.module';
import { EvotorApplicationService } from './evotor-application.service';
import { EvotorController } from './evotor.controller';
import { EvotorProxyController } from './evotor-proxy.controller';
import { EvotorService } from './evotor.service';
import { EvotorIntegrationRepository } from './repositories';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([EvotorApplication, EvotorIntegration]),
    EvotorApiModule.forRoot(),
    OrderModule,
    ProductModule,
    ShopModule,
    UserModule,
  ],
  providers: [
    EvotorService,
    EvotorApplicationService,
    EvotorIntegrationRepository,
  ],
  exports: [
    EvotorService,
    EvotorApplicationService,
    EvotorIntegrationRepository,
    EvotorApiModule,
  ],
  controllers: [EvotorController, EvotorAdminController, EvotorProxyController],
})
export class EvotorModule {}
