import { Roles } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import {
  EvotorAdminCloudTokenDto,
  EvotorAdminDashboard,
  EvotorAdminSyncDto,
} from './dto';
import { EvotorApiService } from './evotor-api.service';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Evotor')
@ApiBearerAuth('JWT')
@Controller('admin/evotor')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EvotorAdminController {
  constructor(private readonly evotorApiService: EvotorApiService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get Evotor bridge dashboard state' })
  async getDashboard(): Promise<AppApiResponse<EvotorAdminDashboard>> {
    const dashboard = await this.evotorApiService.getAdminDashboard();
    return { success: true, data: this.redactSensitive(dashboard) };
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List Evotor bridge accounts' })
  async listAccounts(): Promise<AppApiResponse<unknown[]>> {
    const accounts = await this.evotorApiService.listAdminAccounts();
    return { success: true, data: this.redactSensitive(accounts) };
  }

  @Get('inbox-events')
  @ApiOperation({ summary: 'List Evotor bridge inbox events' })
  async listInboxEvents(): Promise<AppApiResponse<unknown[]>> {
    const events = await this.evotorApiService.listAdminInboxEvents();
    return { success: true, data: this.redactSensitive(events) };
  }

  @Get('stores')
  @ApiOperation({ summary: 'List persisted Evotor stores' })
  async listStores(): Promise<AppApiResponse<unknown[]>> {
    const stores = await this.evotorApiService.listAdminStores();
    return { success: true, data: this.redactSensitive(stores) };
  }

  @Get('devices')
  @ApiOperation({ summary: 'List persisted Evotor devices' })
  async listDevices(): Promise<AppApiResponse<unknown[]>> {
    const devices = await this.evotorApiService.listAdminDevices();
    return { success: true, data: this.redactSensitive(devices) };
  }

  @Get('products')
  @ApiOperation({ summary: 'List persisted Evotor products' })
  async listProducts(): Promise<AppApiResponse<unknown[]>> {
    const products = await this.evotorApiService.listAdminProducts();
    return { success: true, data: this.redactSensitive(products) };
  }

  @Get('documents')
  @ApiOperation({ summary: 'List persisted Evotor documents' })
  async listDocuments(): Promise<AppApiResponse<unknown[]>> {
    const documents = await this.evotorApiService.listAdminDocuments();
    return { success: true, data: this.redactSensitive(documents) };
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
