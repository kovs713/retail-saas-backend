import { StorageService } from '@/modules/storage/storage.service';
import { ProductService } from './product.service';

import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { lookup } from 'mime-types';
import path from 'path';

@ApiTags('Public media')
@Controller('public/media')
@UseGuards(ThrottlerGuard)
@Throttle({
  default: {
    limit: 100,
    ttl: 60000,
  },
})
export class PublicMediaController {
  private readonly logger = new Logger(PublicMediaController.name);

  constructor(
    private readonly productService: ProductService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':shopSlug/products/:productId/:imageName')
  @ApiOperation({
    summary: 'Public product image proxy endpoint',
  })
  async getProductImage(
    @Param('shopSlug')
    shopSlug: string,
    @Param('productId', ParseUUIDPipe)
    productId: string,
    @Param('imageName')
    imageName: string,
    @Res() res: Response,
  ): Promise<void> {
    const safeName = path.basename(imageName);
    if (!/^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i.test(safeName)) {
      throw new BadRequestException('Invalid image name');
    }

    const product = await this.productService.findPublicByShopSlugAndId(
      shopSlug,
      productId,
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const key = this.productService.buildProductImageObjectKey(
      productId,
      safeName,
    );

    let stream: NodeJS.ReadableStream;
    let stat: {
      size: number;
      contentType: string;
      lastModified: Date;
      etag: string;
    };
    try {
      [stat, stream] = await Promise.all([
        this.storageService.statObject(key),
        this.storageService.getObjectStream(key),
      ]);
    } catch (error: unknown) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to get image stream: ${key}`, stack);
      throw new NotFoundException('Image not found');
    }

    const contentType =
      stat.contentType || lookup(safeName) || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', stat.etag);
    res.setHeader('Last-Modified', stat.lastModified.toUTCString());

    stream.on('error', (err: Error) => {
      this.logger.error(`Stream error mid-transfer: ${key}`, err.stack);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    stream.pipe(res);
  }
}
