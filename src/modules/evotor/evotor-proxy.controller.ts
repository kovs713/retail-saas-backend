import { ApiResponse as AppApiResponse } from '@/common/dto';
import { AuthGuard } from '@/common/guards';
import { EvotorApiService, EvotorProxyResponse } from './evotor-api.service';

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

interface ProxyQuery {
  evotorUserId: string;
  cursor?: string;
  dateFrom?: string;
  dateTo?: string;
}

@ApiTags('Evotor Proxy')
@ApiBearerAuth('JWT')
@Controller('api/evotor')
@UseGuards(AuthGuard)
export class EvotorProxyController {
  constructor(private readonly evotorApiService: EvotorApiService) {}

  @Get('stores')
  @ApiOperation({ summary: 'List Evotor stores (live proxy)' })
  async getStores(
    @Query() query: ProxyQuery,
  ): Promise<AppApiResponse<EvotorProxyResponse<unknown>>> {
    const result = await this.evotorApiService.proxyRequest(
      '/api/evotor/stores',
      'GET',
      query.evotorUserId,
      { cursor: query.cursor, evotorUserId: query.evotorUserId },
    );

    return {
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    };
  }

  @Get('devices')
  @ApiOperation({ summary: 'List Evotor devices (live proxy)' })
  async getDevices(
    @Query() query: ProxyQuery,
  ): Promise<AppApiResponse<EvotorProxyResponse<unknown>>> {
    const result = await this.evotorApiService.proxyRequest(
      '/api/evotor/devices',
      'GET',
      query.evotorUserId,
      { cursor: query.cursor, evotorUserId: query.evotorUserId },
    );

    return {
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    };
  }

  @Get('stores/:storeId/products')
  @ApiOperation({ summary: 'List Evotor products for a store (live proxy)' })
  @ApiParam({ name: 'storeId', type: String })
  async getProducts(
    @Param('storeId') storeId: string,
    @Query() query: ProxyQuery,
  ): Promise<AppApiResponse<EvotorProxyResponse<unknown>>> {
    const result = await this.evotorApiService.proxyRequest(
      `/api/evotor/stores/${storeId}/products`,
      'GET',
      query.evotorUserId,
      { cursor: query.cursor, evotorUserId: query.evotorUserId },
    );

    return {
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    };
  }

  @Get('stores/:storeId/products/:productId')
  @ApiOperation({ summary: 'Get single Evotor product (live proxy)' })
  @ApiParam({ name: 'storeId', type: String })
  @ApiParam({ name: 'productId', type: String })
  async getProduct(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Query('evotorUserId') evotorUserId: string,
  ): Promise<AppApiResponse<EvotorProxyResponse<unknown>>> {
    const result = await this.evotorApiService.proxyRequest(
      `/api/evotor/stores/${storeId}/products/${productId}`,
      'GET',
      evotorUserId,
      { evotorUserId },
    );

    return {
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    };
  }

  @Get('stores/:storeId/documents')
  @ApiOperation({ summary: 'List Evotor documents for a store (live proxy)' })
  @ApiParam({ name: 'storeId', type: String })
  async getDocuments(
    @Param('storeId') storeId: string,
    @Query() query: ProxyQuery,
  ): Promise<AppApiResponse<EvotorProxyResponse<unknown>>> {
    const result = await this.evotorApiService.proxyRequest(
      `/api/evotor/stores/${storeId}/documents`,
      'GET',
      query.evotorUserId,
      {
        cursor: query.cursor,
        evotorUserId: query.evotorUserId,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
    );

    return {
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    };
  }

  @Get('stores/:storeId/documents/:documentId')
  @ApiOperation({ summary: 'Get single Evotor document (live proxy)' })
  @ApiParam({ name: 'storeId', type: String })
  @ApiParam({ name: 'documentId', type: String })
  async getDocument(
    @Param('storeId') storeId: string,
    @Param('documentId') documentId: string,
    @Query('evotorUserId') evotorUserId: string,
  ): Promise<AppApiResponse<EvotorProxyResponse<unknown>>> {
    const result = await this.evotorApiService.proxyRequest(
      `/api/evotor/stores/${storeId}/documents/${documentId}`,
      'GET',
      evotorUserId,
      { evotorUserId },
    );

    return {
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    };
  }

  @Get('bulks/:bulkId')
  @ApiOperation({ summary: 'Get Evotor bulk operation status (live proxy)' })
  @ApiParam({ name: 'bulkId', type: String })
  async getBulk(
    @Param('bulkId') bulkId: string,
    @Query('evotorUserId') evotorUserId: string,
  ): Promise<AppApiResponse<EvotorProxyResponse<unknown>>> {
    const result = await this.evotorApiService.proxyRequest(
      `/api/evotor/bulks/${bulkId}`,
      'GET',
      evotorUserId,
      { evotorUserId },
    );

    return {
      success: true,
      data: {
        data: result.data,
        meta: result.meta,
      },
    };
  }
}
