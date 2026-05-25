import { ObjectStorageService } from '@/core/object-storage/object-storage.service';
import { ShopService } from './shop.service';

import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { lookup } from 'mime-types';
import path from 'path';

type ShopMediaType = 'logo' | 'banner';

@ApiTags('Public media')
@Controller('public/media')
@UseGuards(ThrottlerGuard)
@Throttle({
  default: {
    limit: 100,
    ttl: 60000,
  },
})
export class PublicShopMediaController {
  private readonly logger = new Logger(PublicShopMediaController.name);

  constructor(
    private readonly shopService: ShopService,
    private readonly storageService: ObjectStorageService,
  ) {}

  @Get(':shopSlug/shops/:mediaType/:imageName')
  @ApiOperation({ summary: 'Public shop media proxy endpoint' })
  async getShopMedia(
    @Param('shopSlug') shopSlug: string,
    @Param('mediaType') mediaType: ShopMediaType,
    @Param('imageName') imageName: string,
    @Res() res: Response,
  ): Promise<void> {
    if (mediaType !== 'logo' && mediaType !== 'banner') {
      throw new BadRequestException('Invalid media type');
    }

    const safeName = path.basename(imageName);
    if (!/^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i.test(safeName)) {
      throw new BadRequestException('Invalid image name');
    }

    const shop = await this.shopService.findBySlug(shopSlug);
    if (!shop.isActive) {
      throw new NotFoundException('Shop not found');
    }

    const key = `shops/${shop.id}/${mediaType}/${safeName}`;

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
      this.logger.error(`Failed to get shop media stream: ${key}`, stack);
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
