import { Roles, Tenant } from '@/common/decorators';
import {
  ApiResponse as AppApiResponse,
  Pagination,
  PaginationResponse,
} from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { Request, TenantContext } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { ShopService } from '@/modules/shop/shop.service';
import {
  CategoryDto,
  CreateCategoryDto,
  DemoCatalogSeedResultDto,
  ProductDto,
  ProductImageDto,
  ProductImageUploadResponseDto,
  ReorderProductImageDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './dto';
import { ProductService } from './product.service';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@Controller('products')
@UseGuards(AuthGuard, RolesGuard)
export class ProductController {
  private readonly logger = new LoggerService(ProductController.name);
  private static readonly allowedImageExtensions = new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',
  ]);
  private static readonly allowedImageMimeTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]);
  private static readonly maxUploadSizeBytes = 10 * 1024 * 1024;

  constructor(
    private readonly productService: ProductService,
    private readonly shopService: ShopService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get synced Evotor products with local storefront fields',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  async findAll(
    @Query() query: Pagination,
    @Tenant() tenantContext: TenantContext,
    @Req() req: Request,
  ): Promise<PaginationResponse<ProductDto>> {
    const shopId = await this.resolveShopId(query.shopId, tenantContext, req);
    this.logger.log(
      `Finding products with query: page=${query.page}, limit=${query.limit}`,
    );
    const result = await this.productService.findAll(query, shopId);
    this.logger.log(
      `Found ${result.data?.length || 0} products (total: ${result.pagination?.total})`,
    );
    return {
      success: true,
      data: result.data?.map((product) => ProductDto.fromEntity(product)) ?? [],
      pagination: result.pagination,
    };
  }

  @Post('demo-seed')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Apply demo catalog CSV publication whitelist',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description: 'Preview changes without writing updates',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo catalog seed applied successfully',
    type: DemoCatalogSeedResultDto,
  })
  async applyDemoSeed(
    @Query('dryRun') dryRun: string | boolean | undefined,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<DemoCatalogSeedResultDto>> {
    const isDryRun =
      dryRun === true ||
      (typeof dryRun === 'string' && dryRun.toLowerCase() === 'true');
    const result = await this.productService.applyDemoCatalogSeed(
      tenantContext.shopId,
      isDryRun,
    );

    return {
      success: true,
      data: result,
      message: isDryRun
        ? 'Demo catalog seed dry run completed'
        : 'Demo catalog seed applied successfully',
    };
  }

  private async resolveShopId(
    requestedShopId: string | undefined,
    tenantContext: TenantContext,
    req: Request,
  ): Promise<string> {
    if (!requestedShopId || requestedShopId === tenantContext.shopId) {
      return tenantContext.shopId;
    }

    if ((req.user.role as Role) === Role.ADMIN) {
      await this.shopService.findById(requestedShopId);
      return requestedShopId;
    }

    const shop = await this.shopService.findById(requestedShopId);
    if (shop.ownerId !== req.user.sub) {
      throw new ForbiddenException('You do not have access to this shop');
    }

    return requestedShopId;
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get product statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats(
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<
    AppApiResponse<{
      published: number;
      hidden: number;
      inStock: number;
      outOfStock: number;
    }>
  > {
    this.logger.log('Getting product statistics');
    const stats = await this.productService.getStats(tenantContext.shopId);
    this.logger.log(`Statistics: ${JSON.stringify(stats)}`);
    return { success: true, data: stats };
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'Get products with low stock',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Low stock products retrieved',
    type: [ProductDto],
  })
  async getLowStock(
    @Query('threshold')
    threshold: number = 10,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto[]>> {
    this.logger.log(
      `Finding products with low stock (threshold: ${threshold})`,
    );
    const products = await this.productService.findLowStock(
      threshold,
      tenantContext.shopId,
    );
    const response = products.map((product) => ProductDto.fromEntity(product));
    this.logger.log(`Found ${products.length} products with low stock`);
    return { success: true, data: response };
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get all categories for a shop',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: [CategoryDto],
  })
  async getCategories(
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<CategoryDto[]>> {
    this.logger.log(`Finding categories for shop: ${tenantContext.shopId}`);
    const categories = await this.productService.getCategories(
      tenantContext.shopId,
    );
    const response = CategoryDto.fromEntities(categories);
    this.logger.log(`Found ${categories.length} categories`);
    return { success: true, data: response };
  }

  @Get('barcode/:barcode')
  @ApiOperation({
    summary: 'Find product by barcode',
  })
  @ApiParam({
    name: 'barcode',
    type: String,
    description: 'Product barcode',
  })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findByBarcode(
    @Param('barcode')
    barcode: string,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Finding product by barcode: ${barcode}`);
    const product = await this.productService.findByBarcode(
      barcode,
      tenantContext.shopId,
    );
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a product by ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findOne(
    @Param('id')
    id: string,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Finding product by ID: ${id}`);
    const product = await this.productService.findOne(id, tenantContext.shopId);
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Get('sku/:sku')
  @ApiOperation({
    summary: 'Get a product by SKU',
  })
  @ApiParam({
    name: 'sku',
    type: String,
    description: 'Product SKU',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findOneBySku(
    @Param('sku')
    sku: string,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Finding product by SKU: ${sku}`);
    const product = await this.productService.findOneBySku(
      sku,
      tenantContext.shopId,
    );
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product found: ${product.name}`);
    return { success: true, data: response };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Update local storefront product fields',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async update(
    @Param('id')
    id: string,
    @Body()
    updateProductDto: UpdateProductDto,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductDto>> {
    this.logger.log(`Updating product ID: ${id}`);
    const product = await this.productService.update(
      id,
      updateProductDto,
      tenantContext.shopId,
    );
    const response = ProductDto.fromEntity(product);
    this.logger.log(`Product updated successfully: ${product.name}`);
    return {
      success: true,
      data: response,
      message: 'Product updated successfully',
    };
  }

  @Post(':id/images')
  @Roles(Role.OWNER, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload product image',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Product image uploaded successfully',
    type: ProductImageUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or request payload',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async uploadImage(
    @Param('id')
    id: string,
    @UploadedFile()
    file: Express.Multer.File,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductImageUploadResponseDto>> {
    this.validateUploadedImage(file);
    const image = await this.productService.uploadProductImage(
      id,
      file,
      tenantContext.shopId,
    );
    return {
      success: true,
      data: { image: ProductImageDto.fromEntity(image) },
      message: 'Product image uploaded successfully',
    };
  }

  @Get(':id/images')
  @ApiOperation({
    summary: 'Get all product images',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Product images retrieved successfully',
    type: [ProductImageDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getImages(
    @Param('id')
    id: string,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductImageDto[]>> {
    const images = await this.productService.findImagesByProductId(
      id,
      tenantContext.shopId,
    );
    return {
      success: true,
      data: ProductImageDto.fromEntities(images),
    };
  }

  @Delete(':id/images/:imageId')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Delete product image by ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID',
  })
  @ApiParam({
    name: 'imageId',
    type: String,
    description: 'Image ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product image deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product image not found',
  })
  async deleteImage(
    @Param('id')
    _id: string,
    @Param('imageId')
    imageId: string,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<void>> {
    await this.productService.deleteImage(imageId, tenantContext.shopId);
    return { success: true, message: 'Product image deleted successfully' };
  }

  @Patch(':id/images/:imageId/reorder')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Reorder product image',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID',
  })
  @ApiParam({
    name: 'imageId',
    type: String,
    description: 'Image ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product image reordered successfully',
    type: ProductImageDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product image not found',
  })
  async reorderImage(
    @Param('id')
    _id: string,
    @Param('imageId')
    imageId: string,
    @Body()
    body: ReorderProductImageDto,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductImageDto>> {
    const image = await this.productService.reorderImage(
      imageId,
      body.sortOrder,
      tenantContext.shopId,
    );
    return {
      success: true,
      data: ProductImageDto.fromEntity(image),
    };
  }

  @Patch(':id/images/:imageId/primary')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Set product image as primary',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Product ID',
  })
  @ApiParam({
    name: 'imageId',
    type: String,
    description: 'Image ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary image set successfully',
    type: ProductImageDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product image not found',
  })
  async setPrimaryImage(
    @Param('id')
    _id: string,
    @Param('imageId')
    imageId: string,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<ProductImageDto>> {
    const image = await this.productService.setPrimaryImage(
      imageId,
      tenantContext.shopId,
    );
    return {
      success: true,
      data: ProductImageDto.fromEntity(image),
    };
  }

  @Post('categories')
  @Roles(Role.OWNER)
  @ApiOperation({
    summary: 'Create a new category',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category slug already exists',
  })
  async createCategory(
    @Body()
    createCategoryDto: CreateCategoryDto,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<CategoryDto>> {
    this.logger.log(
      `Creating category: ${createCategoryDto.name} for shop: ${tenantContext.shopId}`,
    );
    const category = await this.productService.createCategory(
      tenantContext.shopId,
      createCategoryDto,
    );
    const response = CategoryDto.fromEntity(category);
    this.logger.log(`Category created successfully with ID: ${category.id}`);
    return {
      success: true,
      data: response,
      message: 'Category created successfully',
    };
  }

  @Patch('categories/:id')
  @Roles(Role.OWNER)
  @ApiOperation({
    summary: 'Update a category',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: CategoryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category slug already exists',
  })
  async updateCategory(
    @Param('id')
    id: string,
    @Body()
    updateCategoryDto: UpdateCategoryDto,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<CategoryDto>> {
    this.logger.log(`Updating category ID: ${id}`);
    const category = await this.productService.updateCategory(
      id,
      tenantContext.shopId,
      updateCategoryDto,
    );
    const response = CategoryDto.fromEntity(category);
    this.logger.log(`Category updated successfully: ${category.name}`);
    return {
      success: true,
      data: response,
      message: 'Category updated successfully',
    };
  }

  @Delete('categories/:id')
  @Roles(Role.OWNER)
  @ApiOperation({
    summary: 'Delete a category',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category has associated products',
  })
  async deleteCategory(
    @Param('id')
    id: string,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<void>> {
    this.logger.log(`Deleting category ID: ${id}`);
    await this.productService.deleteCategory(id, tenantContext.shopId);
    this.logger.log(`Category ${id} deleted successfully`);
    return { success: true, message: 'Category deleted successfully' };
  }

  private validateUploadedImage(file?: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (file.size > ProductController.maxUploadSizeBytes) {
      throw new BadRequestException('File too large. Max size is 10MB');
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (
      !extension ||
      !ProductController.allowedImageExtensions.has(extension) ||
      !ProductController.allowedImageMimeTypes.has(file.mimetype)
    ) {
      throw new BadRequestException('Unsupported file type');
    }
  }
}
