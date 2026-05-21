import { Pagination } from '@/common/dto';
import { ProductImageDto } from '@/modules/product/dto/product-image.dto';
import {
  CategoryRepository,
  ProductRepository,
} from '@/modules/product/repositories';
import {
  StorefrontCategoryDto,
  StorefrontPaginatedResponseDto,
  StorefrontPaginationQuery,
  StorefrontProductDto,
  StorefrontResponseDto,
  StorefrontShopDto,
} from './dto';
import { ShopService } from './shop.service';

import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Public shop')
@Controller('public/shop')
export class PublicShopController {
  private readonly logger = new Logger(PublicShopController.name);

  constructor(
    private readonly shopService: ShopService,
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get public storefront data by shop slug (no authentication required)',
  })
  @ApiParam({
    name: 'slug',
    description: 'Shop slug',
    example: 'my-shop',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: StorefrontResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async getStorefront(
    @Param('slug')
    slug: string,
  ): Promise<{ success: true; data: StorefrontResponseDto }> {
    const shop = await this.shopService.findBySlug(slug);

    if (!shop.isActive) {
      throw new BadRequestException('Shop is not active');
    }

    const paginationQuery: Pagination = { page: 1, limit: 100 };
    const [products, totalProducts] =
      await this.productRepository.findSyncedAll(shop.id, paginationQuery);

    const categories = await this.categoryRepository.findAllByShop(shop.id);

    const shopData: StorefrontShopDto = {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      description: shop.description,
      address: shop.address,
      phone: shop.phone,
      workingHours: shop.workingHours,
      logoUrl: shop.logoUrl,
      bannerUrl: shop.bannerUrl,
    };

    const productsData: StorefrontProductDto[] = products.map((product) => {
      let availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
      if (product.quantity <= 0) {
        availability = 'OUT_OF_STOCK';
      } else if (product.quantity < 10) {
        availability = 'LOW_STOCK';
      } else {
        availability = 'IN_STOCK';
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        quantity: product.quantity,
        category: product.category?.name || null,
        images: product.images?.length
          ? ProductImageDto.fromEntities(product.images)
          : null,
        availability,
      };
    });

    const categoriesData: StorefrontCategoryDto[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
    }));

    const response: StorefrontResponseDto = {
      shop: shopData,
      products: productsData,
      categories: categoriesData,
      totalProducts,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `Storefront data fetched for shop ${shop.id}: ${products.length} products, ${categories.length} categories`,
    );

    return { success: true, data: response };
  }

  @Get(':slug/products/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single public product by ID (no authentication required)',
  })
  @ApiParam({
    name: 'slug',
    description: 'Shop slug',
    example: 'my-shop',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID',
    example: 'daffdf77-9826-4a17-aa0b-cf77fe615a45',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: StorefrontProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shop or product not found',
  })
  async getProduct(
    @Param('slug')
    slug: string,
    @Param('productId')
    productId: string,
  ): Promise<{ success: true; data: StorefrontProductDto }> {
    const product = await this.productRepository.findByIdAndShopSlug(
      productId,
      slug,
    );

    if (!product) {
      throw new BadRequestException('Product not found or shop is not active');
    }

    let availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    if (product.quantity <= 0) {
      availability = 'OUT_OF_STOCK';
    } else if (product.quantity < 10) {
      availability = 'LOW_STOCK';
    } else {
      availability = 'IN_STOCK';
    }

    const productData: StorefrontProductDto = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      quantity: product.quantity,
      category: product.category?.name || null,
      images: product.images?.length
        ? ProductImageDto.fromEntities(product.images)
        : null,
      availability,
    };

    this.logger.log(
      `Product data fetched for shop ${slug}, product ${productId}`,
    );

    return { success: true, data: productData };
  }

  @Get(':slug/products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get paginated and filtered storefront products by shop slug (no authentication required)',
  })
  @ApiParam({
    name: 'slug',
    description: 'Shop slug',
    example: 'my-shop',
  })
  @ApiQuery({ type: StorefrontPaginationQuery })
  @ApiResponse({
    status: 200,
    description: 'Successful response with paginated products',
    type: StorefrontPaginatedResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async getStorefrontPaginated(
    @Param('slug')
    slug: string,
    @Query()
    query: StorefrontPaginationQuery,
  ): Promise<{ success: true; data: StorefrontPaginatedResponseDto }> {
    const shop = await this.shopService.findBySlug(slug);

    if (!shop.isActive) {
      throw new BadRequestException('Shop is not active');
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const [products, totalProducts] =
      await this.productRepository.findSyncedAll(shop.id, query);

    const categories = await this.categoryRepository.findAllByShop(shop.id);

    const shopData: StorefrontShopDto = {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      description: shop.description,
      address: shop.address,
      phone: shop.phone,
      workingHours: shop.workingHours,
      logoUrl: shop.logoUrl,
      bannerUrl: shop.bannerUrl,
    };

    const productsData: StorefrontProductDto[] = products.map((product) => {
      let availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
      if (product.quantity <= 0) {
        availability = 'OUT_OF_STOCK';
      } else if (product.quantity < 10) {
        availability = 'LOW_STOCK';
      } else {
        availability = 'IN_STOCK';
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        quantity: product.quantity,
        category: product.category?.name || null,
        images: product.images?.length
          ? ProductImageDto.fromEntities(product.images)
          : null,
        availability,
      };
    });

    const categoriesData: StorefrontCategoryDto[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
    }));

    const response: StorefrontPaginatedResponseDto = {
      shop: shopData,
      products: productsData,
      categories: categoriesData,
      pagination: {
        page,
        limit,
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `Paginated storefront data fetched for shop ${shop.id}: ${products.length} products (page ${page}, total ${totalProducts}), ${categories.length} categories`,
    );

    return { success: true, data: response };
  }
}
