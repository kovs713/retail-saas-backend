import { ApiResponse as AppApiResponse, Pagination, PaginationApiResponse } from '@/common/dto';
import {
  AdjustStockDto,
  CreateProductDto,
  ProductResponseDto,
  ProductRestoreResponseDto,
  ProductStatsResponseDto,
  ProductStockResponseDto,
  UpdateProductDto,
  UpdateStockDto,
} from './dto';
import { ProductService } from './product.service';

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 409, description: 'Conflict - SKU already exists' })
  async create(
    @Body()
    createProductDto: CreateProductDto,
  ): Promise<AppApiResponse<ProductResponseDto>> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`);
    const product = await this.productService.create(createProductDto);
    const response = ProductResponseDto.fromEntity(product);
    this.logger.log(`Product created successfully with ID: ${product.id}`);
    return { success: true, data: response, message: 'Product created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: ProductResponseDto,
    isArray: true,
  })
  async findAll(
    @Query()
    query: Pagination,
  ): Promise<PaginationApiResponse<ProductResponseDto>> {
    this.logger.log(`Finding products with query: page=${query.page}, limit=${query.limit}`);
    const result = await this.productService.findAll(query);
    this.logger.log(`Found ${result.data?.length || 0} products (total: ${result.pagination?.total})`);
    return {
      success: true,
      data: result.data?.map((product) => ProductResponseDto.fromEntity(product)) ?? [],
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(
    @Param('id')
    id: string,
  ): Promise<AppApiResponse<ProductResponseDto>> {
    this.logger.log(`Finding product by ID: ${id}`);
    const product = await this.productService.findOne(id);
    const response = ProductResponseDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Get a product by SKU' })
  @ApiParam({ name: 'sku', type: String, description: 'Product SKU' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOneBySku(
    @Param('sku')
    sku: string,
  ): Promise<AppApiResponse<ProductResponseDto>> {
    this.logger.log(`Finding product by SKU: ${sku}`);
    const product = await this.productService.findOneBySku(sku);
    const response = ProductResponseDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Conflict - SKU already exists' })
  async update(
    @Param('id')
    id: string,
    @Body()
    updateProductDto: UpdateProductDto,
  ): Promise<AppApiResponse<ProductResponseDto>> {
    this.logger.log(`Updating product ID: ${id}`);
    const product = await this.productService.update(id, updateProductDto);
    const response = ProductResponseDto.fromEntity(product);
    this.logger.log(`Product updated successfully: ${product.name}`);
    return { success: true, data: response, message: 'Product updated successfully' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(
    @Param('id')
    id: string,
  ): Promise<AppApiResponse<void>> {
    this.logger.log(`Soft deleting product ID: ${id}`);
    await this.productService.remove(id);
    this.logger.log(`Product ${id} deleted successfully`);
    return { success: true, message: 'Product deleted successfully' };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft deleted product' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product restored successfully', type: ProductRestoreResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async restore(
    @Param('id')
    id: string,
  ): Promise<AppApiResponse<ProductRestoreResponseDto>> {
    this.logger.log(`Restoring product ID: ${id}`);
    const result = await this.productService.restore(id);
    const response: ProductRestoreResponseDto = { message: result.message };
    this.logger.log(`Product ${id} restored successfully`);
    return { success: true, data: response };
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Update product stock quantity' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully', type: ProductStockResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStock(
    @Param('id')
    id: string,
    @Body()
    updateStockDto: UpdateStockDto,
  ): Promise<AppApiResponse<ProductStockResponseDto>> {
    this.logger.log(`Updating stock for product ID: ${id}, quantity: ${updateStockDto.quantity}`);
    const product = await this.productService.updateStock(id, updateStockDto.quantity);
    const response: ProductStockResponseDto = {
      message: 'Stock updated successfully',
      data: ProductResponseDto.fromEntity(product),
    };
    this.logger.log(`Stock updated for product ${id}: ${product.quantity}`);
    return { success: true, data: response, message: 'Stock updated successfully' };
  }

  @Patch(':id/stock/adjust')
  @ApiOperation({ summary: 'Adjust product stock (increase or decrease)' })
  @ApiParam({ name: 'id', type: String, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Stock adjusted successfully', type: ProductStockResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async adjustStock(
    @Param('id')
    id: string,
    @Body()
    adjustStockDto: AdjustStockDto,
  ): Promise<AppApiResponse<ProductStockResponseDto>> {
    this.logger.log(`Adjusting stock for product ID: ${id}, adjustment: ${adjustStockDto.adjustment}`);
    const product = await this.productService.adjustStock(id, adjustStockDto.adjustment);
    const response: ProductStockResponseDto = {
      message: 'Stock adjusted successfully',
      data: ProductResponseDto.fromEntity(product),
    };
    this.logger.log(`Stock adjusted for product ${id}: ${product.quantity}`);
    return { success: true, data: response, message: 'Stock adjusted successfully' };
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find product by barcode' })
  @ApiParam({ name: 'barcode', type: String, description: 'Product barcode' })
  @ApiResponse({ status: 200, description: 'Product found', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findByBarcode(
    @Param('barcode')
    barcode: string,
  ): Promise<AppApiResponse<ProductResponseDto>> {
    this.logger.log(`Finding product by barcode: ${barcode}`);
    const product = await this.productService.findByBarcode(barcode);
    const response = ProductResponseDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get product statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', type: ProductStatsResponseDto })
  async getStats(): Promise<AppApiResponse<ProductStatsResponseDto>> {
    this.logger.log('Getting product statistics');
    const totalProducts = await this.productService.count();
    const lowStockProducts = await this.productService.findLowStock();
    const response: ProductStatsResponseDto = {
      totalProducts,
      lowStockCount: lowStockProducts.length,
    };
    this.logger.log(`Statistics: ${totalProducts} total, ${lowStockProducts.length} low stock`);
    return { success: true, data: response };
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with low stock' })
  @ApiQuery({ name: 'threshold', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved', type: [ProductResponseDto] })
  async getLowStock(
    @Query('threshold')
    threshold: number = 10,
  ): Promise<AppApiResponse<ProductResponseDto[]>> {
    this.logger.log(`Finding products with low stock (threshold: ${threshold})`);
    const products = await this.productService.findLowStock(threshold);
    const response = products.map((product) => ProductResponseDto.fromEntity(product));
    this.logger.log(`Found ${products.length} products with low stock`);
    return { success: true, data: response };
  }
}
