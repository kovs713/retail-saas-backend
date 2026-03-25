import { Roles, Tenant } from '@/common/decorators';
import { ApiResponse as AppApiResponse, Pagination, PaginationResponse } from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { TenantContext } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import {
  AdjustStockDto,
  CategoryDto,
  CreateCategoryDto,
  CreateProductDto,
  ProductDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateStockDto,
} from './dto';
import { ProductService } from './product.service';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@Controller('products')
@UseGuards(AuthGuard, RolesGuard)
export class ProductController {
  private readonly logger = new LoggerService(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: ProductDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 409, description: 'Conflict - SKU already exists' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku} for organization: ${tenantContext.shopId}`);
    const product = await this.productService.create(createProductDto, tenantContext);
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product created successfully with ID: ${product.id}`);
    return { success: true, data: response, message: 'Product created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  async findAll(
    @Query() query: Pagination,
    @Tenant() tenantContext: TenantContext,
  ): Promise<PaginationResponse<ProductDto>> {
    this.logger.log(`Finding products with query: page=${query.page}, limit=${query.limit}`);
    const result = await this.productService.findAll(query, tenantContext);
    this.logger.log(`Found ${result.data?.length || 0} products (total: ${result.pagination?.total})`);
    return {
      success: true,
      data: result.data?.map((product) => ProductDto.fromEntity(product)) ?? [],
      pagination: result.pagination,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get product statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<{ totalProducts: number; lowStockCount: number }>> {
    this.logger.log('Getting product statistics');
    const totalProducts = await this.productService.count(tenantContext);
    const lowStockProducts = await this.productService.findLowStock(10, tenantContext);
    this.logger.log(`Statistics: ${totalProducts} total, ${lowStockProducts.length} low stock`);
    return { success: true, data: { totalProducts, lowStockCount: lowStockProducts.length } };
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with low stock' })
  @ApiQuery({ name: 'threshold', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved', type: [ProductDto] })
  async getLowStock(
    @Query('threshold') threshold: number = 10,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto[]>> {
    this.logger.log(`Finding products with low stock (threshold: ${threshold})`);
    const products = await this.productService.findLowStock(threshold, tenantContext);
    const response = products.map((product) => ProductDto.fromEntity(product));
    this.logger.log(`Found ${products.length} products with low stock`);
    return { success: true, data: response };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories for a shop' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully', type: [CategoryDto] })
  async getCategories(@Tenant() tenantContext: TenantContext): Promise<AppApiResponse<CategoryDto[]>> {
    this.logger.log(`Finding categories for shop: ${tenantContext.shopId}`);
    const categories = await this.productService.getCategories(tenantContext.shopId);
    const response = CategoryDto.fromEntities(categories);
    this.logger.log(`Found ${categories.length} categories`);
    return { success: true, data: response };
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find product by barcode' })
  @ApiParam({ name: 'barcode', type: String, description: 'Product barcode' })
  @ApiResponse({ status: 200, description: 'Product found', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findByBarcode(
    @Param('barcode') barcode: string,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Finding product by barcode: ${barcode}`);
    const product = await this.productService.findByBarcode(barcode, tenantContext);
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string, @Tenant() tenantContext: TenantContext): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Finding product by ID: ${id}`);
    const product = await this.productService.findOne(id, tenantContext);
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Get a product by SKU' })
  @ApiParam({ name: 'sku', type: String, description: 'Product SKU' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOneBySku(
    @Param('sku') sku: string,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Finding product by SKU: ${sku}`);
    const product = await this.productService.findOneBySku(sku, tenantContext);
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: ProductDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Conflict - SKU already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Updating product ID: ${id}`);
    const product = await this.productService.update(id, updateProductDto, tenantContext);
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product updated successfully: ${product.name}`);
    return { success: true, data: response, message: 'Product updated successfully' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string, @Tenant() tenantContext: TenantContext): Promise<AppApiResponse<void>> {
    this.logger.log(`Soft deleting product ID: ${id}`);
    await this.productService.remove(id, tenantContext);
    this.logger.log(`Product ${id} deleted successfully`);
    return { success: true, message: 'Product deleted successfully' };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft deleted product' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product restored successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async restore(
    @Param('id') id: string,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<{ message: string }>> {
    this.logger.log(`Restoring product ID: ${id}`);
    const result = await this.productService.restore(id, tenantContext);
    this.logger.log(`Product ${id} restored successfully`);
    return { success: true, message: result.message };
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Update product stock quantity' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStock(
    @Param('id') id: string,
    @Body() updateStockDto: UpdateStockDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Updating stock for product ID: ${id}, quantity: ${updateStockDto.quantity}`);
    const product = await this.productService.updateStock(id, updateStockDto.quantity, tenantContext);
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Stock updated for product ${id}: ${product.quantity}`);
    return { success: true, data: response, message: 'Stock updated successfully' };
  }

  @Patch(':id/stock/adjust')
  @ApiOperation({ summary: 'Adjust product stock (increase or decrease)' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Stock adjusted successfully', type: ProductDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async adjustStock(
    @Param('id') id: string,
    @Body() adjustStockDto: AdjustStockDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Adjusting stock for product ID: ${id}, adjustment: ${adjustStockDto.adjustment}`);
    const product = await this.productService.adjustStock(id, adjustStockDto.adjustment, tenantContext);
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Stock adjusted for product ${id}: ${product.quantity}`);
    return { success: true, data: response, message: 'Stock adjusted successfully' };
  }

  @Post('categories')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully', type: CategoryDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 409, description: 'Conflict - Category slug already exists' })
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<CategoryDto>> {
    this.logger.log(`Creating category: ${createCategoryDto.name} for shop: ${tenantContext.shopId}`);
    const category = await this.productService.createCategory(tenantContext.shopId, createCategoryDto);
    const response = CategoryDto.fromEntity(category);
    this.logger.log(`Category created successfully with ID: ${category.id}`);
    return { success: true, data: response, message: 'Category created successfully' };
  }

  @Patch('categories/:id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', type: String, description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully', type: CategoryDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Category slug already exists' })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<CategoryDto>> {
    this.logger.log(`Updating category ID: ${id}`);
    const category = await this.productService.updateCategory(id, tenantContext.shopId, updateCategoryDto);
    const response = CategoryDto.fromEntity(category);
    this.logger.log(`Category updated successfully: ${category.name}`);
    return { success: true, data: response, message: 'Category updated successfully' };
  }

  @Delete('categories/:id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', type: String, description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Category has associated products' })
  async deleteCategory(@Param('id') id: string, @Tenant() tenantContext: TenantContext): Promise<AppApiResponse<void>> {
    this.logger.log(`Deleting category ID: ${id}`);
    await this.productService.deleteCategory(id, tenantContext.shopId);
    this.logger.log(`Category ${id} deleted successfully`);
    return { success: true, message: 'Category deleted successfully' };
  }
}
