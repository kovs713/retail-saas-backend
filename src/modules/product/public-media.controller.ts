import { StorageService } from '@/modules/storage/storage.service';
import { ProductService } from './product.service';

import { Controller, Get, Logger, NotFoundException, Param, ParseUUIDPipe, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@ApiTags('Public media')
@Controller('public/media')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class PublicMediaController {
  private readonly logger = new Logger(PublicMediaController.name);

  constructor(
    private readonly productService: ProductService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':shopSlug/products/:productId/:imageName')
  @ApiOperation({ summary: 'Public product image proxy endpoint' })
  async getProductImage(
    @Param('shopSlug') shopSlug: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageName') imageName: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const product = await this.productService.findPublicByShopSlugAndId(shopSlug, productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const key = this.productService.buildProductImageObjectKey(productId, imageName);

    try {
      const stream = await this.storageService.getObjectStream(key);

      res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Failed to stream image: ${key}`, error.stack);
      throw new NotFoundException('Image not found');
    }
  }
}
