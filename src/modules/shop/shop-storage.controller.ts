import { Roles, Tenant } from '@/common/decorators';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { Request, TenantContext } from '@/common/types';
import { ObjectStorageService } from '@/core/object-storage/object-storage.service';
import { ShopMediaPresignedUrlDto } from './dto';
import { ShopService } from './shop.service';

import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

type ShopMediaType = 'logo' | 'banner';

@ApiTags('Storage')
@ApiBearerAuth('JWT')
@Controller('storage/shops')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
export class ShopStorageController {
  private static readonly uploadUrlTtlSeconds = 900;

  constructor(
    private readonly shopService: ShopService,
    private readonly storageService: ObjectStorageService,
  ) {}

  @Get(':shopId/logo/presigned')
  @ApiOperation({ summary: 'Get presigned URL for shop logo upload' })
  @ApiParam({ name: 'shopId', type: String, description: 'Shop ID' })
  @ApiQuery({ name: 'filename', type: String, required: true })
  @ApiResponse({ status: 200, type: ShopMediaPresignedUrlDto })
  async getLogoPresignedUrl(
    @Param('shopId') shopId: string,
    @Query('filename') filename: string,
    @Tenant() tenantContext: TenantContext,
    @Req() req: Request,
  ): Promise<ShopMediaPresignedUrlDto> {
    return this.getPresignedUrl(shopId, 'logo', filename, tenantContext, req);
  }

  @Get(':shopId/banner/presigned')
  @ApiOperation({ summary: 'Get presigned URL for shop banner upload' })
  @ApiParam({ name: 'shopId', type: String, description: 'Shop ID' })
  @ApiQuery({ name: 'filename', type: String, required: true })
  @ApiResponse({ status: 200, type: ShopMediaPresignedUrlDto })
  async getBannerPresignedUrl(
    @Param('shopId') shopId: string,
    @Query('filename') filename: string,
    @Tenant() tenantContext: TenantContext,
    @Req() req: Request,
  ): Promise<ShopMediaPresignedUrlDto> {
    return this.getPresignedUrl(shopId, 'banner', filename, tenantContext, req);
  }

  private async getPresignedUrl(
    shopId: string,
    mediaType: ShopMediaType,
    filename: string,
    tenantContext: TenantContext,
    req: Request,
  ): Promise<ShopMediaPresignedUrlDto> {
    this.assertShopAccess(shopId, tenantContext, req);
    await this.shopService.findById(shopId);

    const safeFileName = this.sanitizeFileName(filename);
    const key = `shops/${shopId}/${mediaType}/${safeFileName}`;

    return {
      uploadUrl: await this.storageService.getPresignedPutUrl(
        key,
        ShopStorageController.uploadUrlTtlSeconds,
      ),
      publicUrl: this.storageService.getPublicUrl(key),
    };
  }

  private sanitizeFileName(filename: string): string {
    const safeFileName = filename
      ?.trim()
      .split('/')
      .pop()
      ?.replace(/[^a-zA-Z0-9._-]/g, '-');

    if (!safeFileName || safeFileName === '.' || safeFileName === '..') {
      throw new BadRequestException('filename is required');
    }

    return safeFileName;
  }

  private assertShopAccess(
    shopId: string,
    tenantContext: TenantContext,
    req: Request,
  ): void {
    if (req.user.role === Role.ADMIN) {
      return;
    }

    if (tenantContext.shopId !== shopId) {
      throw new ForbiddenException('You do not have access to this shop');
    }
  }
}
