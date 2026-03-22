import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  providers: [CategoryService],
  exports: [CategoryService],
  controllers: [CategoryController],
})
export class CategoryModule {}
