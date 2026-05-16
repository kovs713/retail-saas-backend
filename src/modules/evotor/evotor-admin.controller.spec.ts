import { AuthGuard, RolesGuard } from '@/common/guards';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { EvotorAdminController } from './evotor-admin.controller';
import { EvotorApiService } from './evotor-api.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('EvotorAdminController', () => {
  let controller: EvotorAdminController;
  let evotorApiService: DeepMocked<EvotorApiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvotorAdminController],
      providers: [
        { provide: EvotorApiService, useValue: createMock<EvotorApiService>() },
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

    const result = await controller.listAccounts();

    expect(result).toEqual({
      success: true,
      data: [{ id: 'account-1', cloudTokenEncrypted: '[redacted]' }],
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
