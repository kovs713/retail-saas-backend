import { AuthGuard, RolesGuard } from '@/common/guards';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { EvotorAdminController } from './evotor-admin.controller';
import { EvotorApiService } from './evotor-api.service';
import { EvotorApplicationService } from './evotor-application.service';
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
  let evotorApplicationService: DeepMocked<EvotorApplicationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvotorAdminController],
      providers: [
        { provide: EvotorApiService, useValue: createMock<EvotorApiService>() },
        { provide: EvotorService, useValue: createMock<EvotorService>() },
        {
          provide: EvotorApplicationService,
          useValue: createMock<EvotorApplicationService>(),
        },
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
    evotorApplicationService = module.get(EvotorApplicationService);
  });

  it('lists Evotor applications', async () => {
    evotorApplicationService.list.mockResolvedValue([
      {
        id: 'application-1',
        userId: 'owner-1',
        shopId: 'shop-1',
        evotorUserId: 'evotor-user-1',
        status: 'PENDING',
        rejectionReason: null,
        reviewedAt: null,
        createdAt: new Date('2026-05-18T00:00:00.000Z'),
      },
    ] as never);

    const result = await controller.listApplications(undefined as never);

    expect(evotorApplicationService.list).toHaveBeenCalledWith(undefined);
    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ id: 'application-1' })],
    });
  });

  it('approves Evotor application', async () => {
    evotorApplicationService.approve.mockResolvedValue({
      id: 'application-1',
      userId: 'owner-1',
      shopId: 'shop-1',
      evotorUserId: 'evotor-user-1',
      status: 'APPROVED',
      rejectionReason: null,
      reviewedAt: new Date('2026-05-18T00:00:00.000Z'),
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
    } as never);

    const result = await controller.approveApplication('application-1');

    expect(evotorApplicationService.approve).toHaveBeenCalledWith(
      'application-1',
    );
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({ id: 'application-1' }),
      message: 'Evotor application approved successfully',
    });
  });

  it('rejects Evotor application', async () => {
    evotorApplicationService.reject.mockResolvedValue({
      id: 'application-1',
      userId: 'owner-1',
      shopId: 'shop-1',
      evotorUserId: 'evotor-user-1',
      status: 'REJECTED',
      rejectionReason: 'bad account',
      reviewedAt: new Date('2026-05-18T00:00:00.000Z'),
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
    } as never);

    const result = await controller.rejectApplication('application-1', {
      reason: 'bad account',
    });

    expect(evotorApplicationService.reject).toHaveBeenCalledWith(
      'application-1',
      'bad account',
    );
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({ id: 'application-1' }),
      message: 'Evotor application rejected successfully',
    });
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
