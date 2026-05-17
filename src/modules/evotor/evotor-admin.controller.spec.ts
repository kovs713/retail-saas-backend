import { AuthGuard, RolesGuard } from '@/common/guards';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { EvotorAdminController } from './evotor-admin.controller';
import { EvotorApiService } from './evotor-api.service';
import { EvotorService } from './evotor.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('EvotorAdminController', () => {
  let controller: EvotorAdminController;
  let evotorApiService: DeepMocked<EvotorApiService>;
  let evotorService: DeepMocked<EvotorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvotorAdminController],
      providers: [
        { provide: EvotorApiService, useValue: createMock<EvotorApiService>() },
        { provide: EvotorService, useValue: createMock<EvotorService>() },
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(
        mockAuthGuard({
          sub: 'admin-1',
          email: 'admin@test.com',
          shopId: null,
          role: 'admin',
        }),
      )
      .overrideGuard(RolesGuard)
      .useValue(mockGuard())
      .compile();

    controller = module.get(EvotorAdminController);
    evotorApiService = module.get(EvotorApiService);
    evotorService = module.get(EvotorService);
  });

  it('returns dashboard state', async () => {
    evotorApiService.getAdminDashboard.mockResolvedValue({
      accounts: [{ id: 'account-1', cloudTokenEncrypted: 'secret' }],
      inboxEvents: [],
      stores: [],
      devices: [],
      products: [],
      documents: [],
    });

    const result = await controller.getDashboard();

    expect(result).toEqual({
      success: true,
      data: {
        accounts: [{ id: 'account-1', cloudTokenEncrypted: '[redacted]' }],
        inboxEvents: [],
        stores: [],
        devices: [],
        products: [],
        documents: [],
      },
    });
  });

  it('returns account list', async () => {
    evotorApiService.listAdminAccounts.mockResolvedValue([
      { id: 'account-1', cloudTokenEncrypted: 'secret' },
    ]);

    const result = await controller.listAccounts({});

    expect(result).toEqual({
      success: true,
      data: [{ id: 'account-1', cloudTokenEncrypted: '[redacted]' }],
    });
  });

  it('proxies admin list query filters', async () => {
    const query = { evotorUserId: 'evotor-user-1', storeId: 'store-1' };
    evotorApiService.listAdminAccounts.mockResolvedValue([]);
    evotorApiService.listAdminInboxEvents.mockResolvedValue([]);
    evotorApiService.listAdminStores.mockResolvedValue([]);
    evotorApiService.listAdminDevices.mockResolvedValue([]);
    evotorApiService.listAdminProducts.mockResolvedValue([]);
    evotorApiService.listAdminDocuments.mockResolvedValue([]);

    await controller.listAccounts(query);
    await controller.listInboxEvents(query);
    await controller.listStores(query);
    await controller.listDevices(query);
    await controller.listProducts(query);
    await controller.listDocuments(query);

    expect(evotorApiService.listAdminAccounts).toHaveBeenCalledWith(query);
    expect(evotorApiService.listAdminInboxEvents).toHaveBeenCalledWith(query);
    expect(evotorApiService.listAdminStores).toHaveBeenCalledWith(query);
    expect(evotorApiService.listAdminDevices).toHaveBeenCalledWith(query);
    expect(evotorApiService.listAdminProducts).toHaveBeenCalledWith(query);
    expect(evotorApiService.listAdminDocuments).toHaveBeenCalledWith(query);
  });

  it('links a shop to a bridge store', async () => {
    const payload = {
      shopId: 'shop-1',
      evotorUserId: 'evotor-user-1',
      storeId: 'store-1',
      deviceId: 'device-1',
      syncProducts: true,
    };
    evotorService.linkStore.mockResolvedValue({
      id: 'integration-1',
      shopId: 'shop-1',
      status: 'connected',
      provider: 'evotor',
      externalUserId: 'evotor-user-1',
      externalStoreId: 'store-1',
      externalDeviceId: 'device-1',
      metadata: { cloudTokenEncrypted: 'secret' },
    } as never);

    const result = await controller.linkStore(payload);

    expect(evotorService.linkStore).toHaveBeenCalledWith(payload);
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        id: 'integration-1',
        metadata: { cloudTokenEncrypted: '[redacted]' },
      }),
      message: 'Evotor store linked successfully',
    });
  });

  it('triggers bridge sync', async () => {
    const payload = {
      evotorUserId: 'evotor-user-1',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-16',
    };
    evotorApiService.syncAdmin.mockResolvedValue({ batchId: 'batch-1' });

    const result = await controller.sync(payload);

    expect(evotorApiService.syncAdmin).toHaveBeenCalledWith(payload);
    expect(result).toEqual({
      success: true,
      data: { batchId: 'batch-1' },
      message: 'Evotor bridge sync started successfully',
    });
  });

  it('forwards cloud token for bridge admin recovery', async () => {
    const payload = {
      evotorUserId: 'evotor-user-1',
      token: 'cloud-token',
    };
    evotorApiService.setAdminCloudToken.mockResolvedValue({ status: 'ok' });

    const result = await controller.setCloudToken(payload);

    expect(evotorApiService.setAdminCloudToken).toHaveBeenCalledWith(payload);
    expect(result).toEqual({
      success: true,
      data: { status: 'ok' },
      message: 'Evotor cloud token forwarded to bridge successfully',
    });
  });
});
