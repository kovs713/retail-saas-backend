import { ROLES_KEY } from '@/common/decorators';
import { Role } from '@/common/enums';
import { Request } from '@/common/types';
import { EvotorApplicationService } from './evotor-application.service';
import { EvotorController } from './evotor.controller';
import { EvotorService } from './evotor.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Reflector } from '@nestjs/core';

describe('EvotorController', () => {
  let controller: EvotorController;
  let evotorService: DeepMocked<EvotorService>;
  let evotorApplicationService: DeepMocked<EvotorApplicationService>;

  beforeEach(() => {
    evotorService = createMock<EvotorService>();
    evotorApplicationService = createMock<EvotorApplicationService>();
    controller = new EvotorController(evotorService, evotorApplicationService);
  });

  it('allows raw connect only for admins', () => {
    const roles = new Reflector().get<Role[]>(
      ROLES_KEY,
      EvotorController.prototype.connect,
    );

    expect(roles).toEqual([Role.ADMIN]);
  });

  it('syncs bridge account by evotor_user_id for shop owner', async () => {
    evotorService.syncBridgeAccount.mockResolvedValue({ batchId: 'batch-1' });

    const result = await controller.syncBridgeAccount(
      'shop-1',
      { evotor_user_id: 'evotor-user-1' },
      {
        user: {
          sub: 'owner-1',
          email: 'owner@test.com',
          shopId: 'shop-1',
          role: Role.OWNER,
        },
      } as Request,
    );

    expect(evotorService.syncBridgeAccount).toHaveBeenCalledWith('shop-1', {
      evotor_user_id: 'evotor-user-1',
    });
    expect(evotorService.connect).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      data: { batchId: 'batch-1' },
      message: 'Evotor bridge sync started successfully',
    });
  });

  it('creates Evotor application for shop owner', async () => {
    evotorApplicationService.create.mockResolvedValue({
      id: 'application-1',
      userId: 'owner-1',
      shopId: 'shop-1',
      evotorUserId: 'evotor-user-1',
      status: 'PENDING',
      rejectionReason: null,
      reviewedAt: null,
      createdAt: new Date('2026-05-18T00:00:00.000Z'),
    } as never);

    const result = await controller.createApplication(
      'shop-1',
      { evotor_user_id: 'evotor-user-1' },
      {
        user: {
          sub: 'owner-1',
          email: 'owner@test.com',
          shopId: 'shop-1',
          role: Role.OWNER,
        },
      } as Request,
    );

    expect(evotorApplicationService.create).toHaveBeenCalledWith('shop-1', {
      evotor_user_id: 'evotor-user-1',
    });
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({ id: 'application-1' }),
      message: 'Evotor application created successfully',
    });
  });

  it('returns latest sell inbox events for shop owner dashboard', async () => {
    evotorService.getLatestSellInboxEvents.mockResolvedValue({
      items: [
        {
          id: 'event-1',
          eventType: 'evotor.documents.received',
          payload: { type: 'SELL' },
        },
      ],
      total: 1,
      skip: 0,
      take: 5,
    } as never);

    const result = await controller.getSellInboxEvents(
      'shop-1',
      {
        user: {
          sub: 'owner-1',
          email: 'owner@test.com',
          shopId: 'shop-1',
          role: Role.OWNER,
        },
      } as Request,
      { skip: 0, take: 5 },
    );

    expect(evotorService.getLatestSellInboxEvents).toHaveBeenCalledWith(
      'shop-1',
      0,
      5,
    );
    expect(result).toEqual({
      success: true,
      data: {
        items: [
          {
            id: 'event-1',
            eventType: 'evotor.documents.received',
            payload: { type: 'SELL' },
          },
        ],
        total: 1,
        skip: 0,
        take: 5,
      },
    });
  });
});
