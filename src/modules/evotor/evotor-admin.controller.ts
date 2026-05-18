import { Roles } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { RegistrationStatus, Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import {
  EvotorAdminCloudTokenDto,
  EvotorAdminDashboard,
  EvotorAdminLinkStoreDto,
  EvotorAdminListQueryDto,
  EvotorAdminSyncDto,
  EvotorApplicationDto,
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

  @Post('applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve Evotor integration application' })
  @ApiParam({ name: 'id', type: String })
  async approveApplication(
    @Param('id')
    id: string,
  ): Promise<AppApiResponse<EvotorApplicationDto>> {
    const application = await this.evotorApplicationService.approve(id);
    return {
      success: true,
      data: EvotorApplicationDto.fromEntity(application),
      message: 'Evotor application approved successfully',
    };
  }

  @Post('applications/:id/reject')
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
  @ApiOperation({ summary: 'List Evotor bridge accounts' })
  async listAccounts(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<unknown[]>> {
    const accounts = await this.evotorApiService.listAdminAccounts(query);
    return { success: true, data: this.redactSensitive(accounts) };
  }

  @Get('inbox-events')
  @ApiOperation({ summary: 'List Evotor bridge inbox events' })
  async listInboxEvents(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<unknown[]>> {
    const events = await this.evotorApiService.listAdminInboxEvents(query);
    return { success: true, data: this.redactSensitive(events) };
  }

  @Get('stores')
  @ApiOperation({ summary: 'List persisted Evotor stores' })
  async listStores(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<unknown[]>> {
    const stores = await this.evotorApiService.listAdminStores(query);
    return { success: true, data: this.redactSensitive(stores) };
  }

  @Get('devices')
  @ApiOperation({ summary: 'List persisted Evotor devices' })
  async listDevices(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<unknown[]>> {
    const devices = await this.evotorApiService.listAdminDevices(query);
    return { success: true, data: this.redactSensitive(devices) };
  }

  @Get('products')
  @ApiOperation({ summary: 'List persisted Evotor products' })
  async listProducts(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<unknown[]>> {
    const products = await this.evotorApiService.listAdminProducts(query);
    return { success: true, data: this.redactSensitive(products) };
  }

  @Get('documents')
  @ApiOperation({ summary: 'List persisted Evotor documents' })
  async listDocuments(
    @Query() query: EvotorAdminListQueryDto,
  ): Promise<AppApiResponse<unknown[]>> {
    const documents = await this.evotorApiService.listAdminDocuments(query);
    return { success: true, data: this.redactSensitive(documents) };
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
  @ApiOperation({ summary: 'Trigger Evotor bridge sync' })
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
}
