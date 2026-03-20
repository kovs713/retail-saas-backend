import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RolesGuard, Role } from '@/core/auth/guards/roles.guard';
import { Roles } from '@/core/auth/decorators/roles.decorator';

import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('shops/:shopId/categories')
@UseGuards(RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiParam({ name: 'shopId', description: 'Shop ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, type: Category })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Category slug already exists' })
  async create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return await this.categoryService.create(shopId, createCategoryDto);
  }

  @Get()
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get all categories for a shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, type: [Category] })
  async findAll(@Param('shopId', ParseUUIDPipe) shopId: string): Promise<Category[]> {
    return await this.categoryService.findAll(shopId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'shopId', description: 'Shop ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiParam({ name: 'id', description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @ApiResponse({ status: 200, type: Category })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('id', ParseUUIDPipe) categoryId: string,
  ): Promise<Category> {
    return await this.categoryService.findOne(categoryId, shopId);
  }

  @Put(':id')
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'shopId', description: 'Shop ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiParam({ name: 'id', description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @ApiResponse({ status: 200, type: Category })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category slug already exists' })
  async update(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return await this.categoryService.update(categoryId, shopId, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'shopId', description: 'Shop ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiParam({ name: 'id', description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async remove(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('id', ParseUUIDPipe) categoryId: string,
  ): Promise<void> {
    await this.categoryService.remove(categoryId, shopId);
  }
}
