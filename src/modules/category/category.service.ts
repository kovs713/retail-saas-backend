import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Category } from './entities/category.entity';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryService {
  private readonly logger: LoggerService = new LoggerService(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly cacheService: CacheService,
  ) {}

  async create(shopId: string, createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      const existingCategory = await this.categoryRepository.findOne({
        where: {
          shopId,
          slug: createCategoryDto.slug,
        },
      });

      if (existingCategory) {
        throw new ConflictException(`Category with slug "${createCategoryDto.slug}" already exists for this shop`);
      }

      const category = this.categoryRepository.create({
        ...createCategoryDto,
        shopId,
      });

      const savedCategory = await this.categoryRepository.save(category);
      await this.invalidateCategoryCache(shopId, savedCategory.id);
      return savedCategory;
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create category: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async findAll(shopId: string): Promise<Category[]> {
    const cacheKey = this.cacheService.generateKey('categories', 'shop', shopId);
    const cached = await this.cacheService.get<Category[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const categories = await this.categoryRepository.find({
        where: { shopId },
        order: { name: 'ASC' },
      });

      await this.cacheService.set(cacheKey, categories, 300);

      return categories;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to find categories: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async findOne(id: string, shopId: string): Promise<Category> {
    const cacheKey = this.cacheService.generateKey('category', 'id', id);
    const cached = await this.cacheService.get<Category>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const category = await this.categoryRepository.findOne({
        where: { id, shopId },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID "${id}" not found`);
      }

      await this.cacheService.set(cacheKey, category, 600);

      return category;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to find category: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async update(id: string, shopId: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    try {
      const category = await this.findOne(id, shopId);

      if (updateCategoryDto.slug) {
        const existingCategory = await this.categoryRepository.findOne({
          where: {
            shopId,
            slug: updateCategoryDto.slug,
          },
        });

        if (existingCategory && existingCategory.id !== id) {
          throw new ConflictException(`Category with slug "${updateCategoryDto.slug}" already exists for this shop`);
        }
      }

      Object.assign(category, updateCategoryDto);
      const updated = await this.categoryRepository.save(category);
      await this.invalidateCategoryCache(shopId, updated.id);
      return updated;
    } catch (error: unknown) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to update category: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async remove(id: string, shopId: string): Promise<void> {
    try {
      const category = await this.findOne(id, shopId);
      await this.categoryRepository.remove(category);
      await this.invalidateCategoryCache(shopId, id);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to remove category: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async invalidateCategoryCache(shopId: string, categoryId?: string): Promise<void> {
    if (categoryId) {
      await this.cacheService.del(this.cacheService.generateKey('category', 'id', categoryId));
    }
    await this.cacheService.del(this.cacheService.generateKey('categories', 'shop', shopId));
  }
}
