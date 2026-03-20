import { Module, forwardRef } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Category } from './entities/category.entity';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { AuthModule } from '@/core/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), forwardRef(() => AuthModule)],
  providers: [CategoryService],
  controllers: [CategoryController],
  exports: [CategoryService, TypeOrmModule],
})
export class CategoryModule {}
