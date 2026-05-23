import { Roles } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { RegistrationStatus, Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { Product } from '@/modules/product/entities';
import { ProductRepository } from '@/modules/product/repositories';
import {
  EvotorAccountDto,
  EvotorAdminCloudTokenDto,
  EvotorAdminDashboard,
  EvotorAdminDeleteSyncDocumentsQueryDto,
  EvotorAdminDeleteSyncDocumentsResponseDto,
  EvotorAdminLinkStoreDto,
  EvotorAdminListQueryDto,
  EvotorAdminListResponse,
  EvotorAdminSelectorsDto,
  EvotorAdminProcessInboxEventsQueryDto,
  EvotorAdminStoreSyncDto,
  EvotorAdminSyncDto,
  EvotorApplicationDto,
  EvotorDeviceDto,
  EvotorInboxEventDto,
  EvotorProductDto,
  EvotorStoreDto,
  RejectEvotorApplicationDto,
} from './dto';
import { EvotorApiService } from './evotor-api.service';
import { EvotorApplicationService } from './evotor-application.service';
import { EvotorService } from './evotor.service';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin Evotor')
@ApiBearerAuth('JWT')
@Controller('admin/evotor')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EvotorAdminController {
  constructor(
    private readonly evotorApiService: EvotorApiService,
    private readonly evotorService: EvotorService,
    private readonly evotorApplicationService: EvotorApplicationService,
    private readonly productRepository: ProductRepository,
  ) {}

  @Get('applications')
  @ApiOperation({ summary: 'List Evotor integration applications' })
  async listApplications(
    @Query('status')
    status: RegistrationStatus,
  ): Promise<AppApiResponse<EvotorApplicationDto[]>> {
    const applications = await this.evotorApplicationService.list(status);
    return {
      success: true,
      data: EvotorApplicationDto.fromEntities(applications),
    };
  }

  @Patch('applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve Evotor integration application' })
  @ApiParam({ name: 'id', type: String })
  async approveApplication(
    @Param('id')
    id: string,
  ): Promise<AppApiResponse<EvotorApplicationDto>> {
    const application = await this.evotorApplicationService.approve(id);
    await this.evotorService.syncApprovedIntegration(
      application.shopId,
      application.evotorUserId,
      { runBridgeSync: false },
    );
    void this.evotorService.warmSellDashboardCaches(application.shopId);
    return {
      success: true,
      data: EvotorApplicationDto.fromEntity(application),
      message: 'Evotor application approved successfully',
    };
  }

  @Patch('applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject Evotor integration application' })
  @ApiParam({ name: 'id', type: String })
  async rejectApplication(
    @Param('id')
    id: string,
    @Body()
    body: RejectEvotorApplicationDto,
  ): Promise<AppApiResponse<EvotorApplicationDto>> {
    const application = await this.evotorApplicationService.reject(
      id,
      body.reason,
    );
    return {
      success: true,
      data: EvotorApplicationDto.fromEntity(application),
      message: 'Evotor application rejected successfully',
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get Evotor bridge dashboard state' })
  async getDashboard(): Promise<AppApiResponse<EvotorAdminDashboard>> {
    const dashboard = await this.evotorApiService.getAdminDashboard();
    return { success: true, data: this.redactSensitive(dashboard) };
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List Evotor bridge accounts with pagination' })
  async listAccounts(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<EvotorAdminListResponse<EvotorAccountDto>>> {
    const result = await this.evotorApiService.listAdminAccounts(query);
    return {
      success: true,
      data: this.redactSensitive(result),
    };
  }

  @Get('inbox-events')
  @ApiOperation({ summary: 'List Evotor bridge inbox events with pagination' })
  async listInboxEvents(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<EvotorAdminListResponse<EvotorInboxEventDto>>> {
    const result = await this.evotorApiService.listAdminInboxEvents(query);
    return {
      success: true,
      data: this.redactSensitive(result),
    };
  }

  @Get('selectors')
  @ApiOperation({ summary: 'List Evotor selector options' })
  async getSelectors(): Promise<AppApiResponse<EvotorAdminSelectorsDto>> {
    const result = await this.evotorApiService.getAdminSelectors();
    return {
      success: true,
      data: this.redactSensitive(result),
    };
  }

  @Post('inbox-events/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process received Evotor bridge inbox events' })
  async processInboxEvents(
    @Query() query: EvotorAdminProcessInboxEventsQueryDto,
  ): Promise<AppApiResponse<unknown>> {
    const result = await this.evotorApiService.processAdminInboxEvents(query);
    return {
      success: true,
      data: this.redactSensitive(result),
      message: 'Evotor inbox events processed successfully',
    };
  }

  @Get('stores')
  @ApiOperation({ summary: 'List persisted Evotor stores with pagination' })
  async listStores(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<EvotorAdminListResponse<EvotorStoreDto>>> {
    const result = await this.evotorApiService.listAdminStores(query);
    return {
      success: true,
      data: this.redactSensitive(result),
    };
  }

  @Get('devices')
  @ApiOperation({ summary: 'List persisted Evotor devices with pagination' })
  async listDevices(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<EvotorAdminListResponse<EvotorDeviceDto>>> {
    const result = await this.evotorApiService.listAdminDevices(query);
    return {
      success: true,
      data: this.redactSensitive(result),
    };
  }

  @Get('products')
  @ApiOperation({ summary: 'List persisted Evotor products with pagination' })
  async listProducts(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<EvotorAdminListResponse<EvotorProductDto>>> {
    const result = await this.evotorApiService.listAdminProducts(query);
    if (result.total === 0) {
      const localResult = await this.listLocalEvotorProducts(query);
      if (localResult.total > 0) {
        return {
          success: true,
          data: localResult,
        };
      }
    }

    return {
      success: true,
      data: this.redactSensitive(result),
    };
  }

  @Get('documents')
  @ApiOperation({ summary: 'List persisted Evotor documents with pagination' })
  async listDocuments(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<EvotorAdminListResponse<EvotorInboxEventDto>>> {
    const result = await this.evotorApiService.listAdminDocuments(query);
    return {
      success: true,
      data: this.redactSensitive(result),
    };
  }

  @Post('link-store')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Link local shop to Evotor bridge store' })
  async linkStore(
    @Body()
    body: EvotorAdminLinkStoreDto,
  ): Promise<AppApiResponse<unknown>> {
    const integration = await this.evotorService.linkStore(body);
    return {
      success: true,
      data: this.redactSensitive(integration),
      message: 'Evotor store linked successfully',
    };
  }

  @Delete('shops/:shopId/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlink local shop from Evotor bridge store' })
  @ApiParam({ name: 'shopId', type: String })
  async unlinkStore(
    @Param('shopId')
    shopId: string,
  ): Promise<AppApiResponse<unknown>> {
    const integration = await this.evotorService.unlinkStore(shopId);
    return {
      success: true,
      data: this.redactSensitive(integration),
      message: 'Evotor store unlinked successfully',
    };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger Evotor bridge sync (all stores)' })
  async sync(
    @Body()
    body: EvotorAdminSyncDto,
  ): Promise<AppApiResponse<unknown>> {
    const result = await this.evotorApiService.syncAdmin(body);
    return {
      success: true,
      data: this.redactSensitive(result),
      message: 'Evotor bridge sync started successfully',
    };
  }

  @Delete('sync/documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete persisted Evotor sync documents' })
  async deleteSyncDocuments(
    @Query() query: EvotorAdminDeleteSyncDocumentsQueryDto,
  ): Promise<AppApiResponse<EvotorAdminDeleteSyncDocumentsResponseDto>> {
    const result = await this.evotorApiService.deleteAdminSyncDocuments(query);
    return {
      success: true,
      data: result,
      message: 'Evotor sync documents deleted successfully',
    };
  }

  @Post('sync/stores/:storeId/products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync products for a specific store' })
  @ApiParam({ name: 'storeId', type: String })
  async syncStoreProducts(
    @Param('storeId') storeId: string,
    @Body()
    body: EvotorAdminStoreSyncDto,
  ): Promise<AppApiResponse<unknown>> {
    const result = await this.evotorApiService.syncStoreProducts(storeId, body);
    return {
      success: true,
      data: this.redactSensitive(result),
      message: 'Evotor store products sync started successfully',
    };
  }

  @Post('sync/stores/:storeId/documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync documents for a specific store' })
  @ApiParam({ name: 'storeId', type: String })
  async syncStoreDocuments(
    @Param('storeId') storeId: string,
    @Body()
    body: EvotorAdminStoreSyncDto,
  ): Promise<AppApiResponse<unknown>> {
    const result = await this.evotorApiService.syncStoreDocuments(
      storeId,
      body,
    );
    return {
      success: true,
      data: this.redactSensitive(result),
      message: 'Evotor store documents sync started successfully',
    };
  }

  @Post('cloud-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set Evotor Cloud token in bridge for admin recovery',
  })
  async setCloudToken(
    @Body()
    body: EvotorAdminCloudTokenDto,
  ): Promise<AppApiResponse<unknown>> {
    const result = await this.evotorApiService.setAdminCloudToken(body);
    return {
      success: true,
      data: this.redactSensitive(result),
      message: 'Evotor cloud token forwarded to bridge successfully',
    };
  }

  private redactSensitive<T>(value: T): T {
    if (Array.isArray(value)) {
      return (value as unknown[]).map((item) =>
        this.redactSensitive(item),
      ) as unknown as T;
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        /token|authorization/i.test(key)
          ? '[redacted]'
          : this.redactSensitive(entry),
      ]),
    ) as T;
  }

  private async listLocalEvotorProducts(
    query: EvotorAdminListQueryDto,
  ): Promise<EvotorAdminListResponse<EvotorProductDto>> {
    const [products, total] =
      await this.productRepository.findSyncedAdmin(query);

    return {
      items: products.map((product) => this.toEvotorProductDto(product)),
      total,
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    };
  }

  private toEvotorProductDto(product: Product): EvotorProductDto {
    const evotorMetadata = this.getEvotorMetadata(product);

    return {
      id: product.externalId ?? product.id,
      articleNumber: product.sku,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      storeId: product.externalStoreId ?? evotorMetadata.storeId,
      evotorUserId: evotorMetadata.userId,
      localProductId: product.id,
      metadata: product.metadata,
      createdAt: product.createdAt?.toISOString(),
      updatedAt: product.updatedAt?.toISOString(),
    };
  }

  private getEvotorMetadata(product: Product): {
    storeId?: string;
    userId?: string;
  } {
    const evotor = product.metadata?.evotor;
    if (!evotor || typeof evotor !== 'object' || Array.isArray(evotor)) {
      return {};
    }

    const metadata = evotor as Record<string, unknown>;
    return {
      storeId:
        typeof metadata.storeId === 'string' ? metadata.storeId : undefined,
      userId: typeof metadata.userId === 'string' ? metadata.userId : undefined,
    };
  }
}
