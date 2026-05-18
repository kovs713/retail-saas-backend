import { Pagination } from '@/common/dto';
import { ProductImageDto } from '@/modules/product/dto/product-image.dto';
import {
  CategoryRepository,
  ProductRepository,
} from '@/modules/product/repositories';
import {
  StorefrontCategoryDto,
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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

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
}
