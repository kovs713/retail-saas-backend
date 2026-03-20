import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AppLogger } from '@/core/logger/app-logger.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CategoryService {
  private readonly logger: AppLogger = new AppLogger(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
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

      return await this.categoryRepository.save(category);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(shopId: string): Promise<Category[]> {
    try {
      return await this.categoryRepository.find({
        where: { shopId },
        order: { name: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Failed to find categories: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string, shopId: string): Promise<Category> {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id, shopId },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID "${id}" not found`);
      }

      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to find category: ${error.message}`, error.stack);
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
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string, shopId: string): Promise<void> {
    try {
      const category = await this.findOne(id, shopId);
      await this.categoryRepository.remove(category);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to remove category: ${error.message}`, error.stack);
      throw error;
    }
  }
}
