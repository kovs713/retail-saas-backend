import * as modules from '@/modules/index';
import { Module } from '@nestjs/common';
import { RagController } from './rag/rag.controller';

@Module({
  imports: Object.values(modules),
  controllers: [RagController],
})
export class ApiModule {}
