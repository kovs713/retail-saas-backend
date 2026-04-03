import { CacheModule } from '@/core/cache/cache.module';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { PublicRagController } from './public-rag.controller';
import { RagModule } from './rag.module';

import { Module } from '@nestjs/common';

@Module({
  imports: [RagModule, AnalyticsModule, ShopModule, CacheModule],
  controllers: [PublicRagController],
})
export class PublicRagModule {}
