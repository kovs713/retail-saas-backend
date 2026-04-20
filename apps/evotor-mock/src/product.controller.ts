import { AppService } from './app.service';

import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

@Controller('stores/:storeId/products')
export class ProductController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getProducts(@Param('storeId') storeId: string) {
    return {
      items: this.appService.getProductsByStoreId(storeId),
      paging: {},
    };
  }

  @Get(':productId')
  getProduct(@Param('storeId') storeId: string, @Param('productId') productId: string) {
    const product = this.appService.getProductById(storeId, productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
