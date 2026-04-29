import { AppService } from '../app.service';

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
} from '@nestjs/common';

@Controller('stores/:storeId/products')
export class ProductController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getProducts(
    @Param('storeId')
    storeId: string,
    @Query('id')
    id?: string,
    @Query('since')
    since?: string,
  ) {
    return {
      items: this.appService.getProductsByStoreId(storeId, id, since),
      paging: {},
    };
  }

  @Put()
  upsertProducts(
    @Param('storeId')
    storeId: string,
    @Body()
    body: {
      id: string;
      name: string;
      price: number;
      quantity: number;
      article_number: string;
    }[],
  ) {
    return {
      items: this.appService.upsertProducts(storeId, body),
      paging: {},
    };
  }

  @Get(':productId')
  getProduct(
    @Param('storeId')
    storeId: string,
    @Param('productId')
    productId: string,
  ) {
    const product = this.appService.getProductById(storeId, productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
