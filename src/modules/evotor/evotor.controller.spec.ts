import { ROLES_KEY } from '@/common/decorators';
import { Role } from '@/common/enums';
import { Request } from '@/common/types';
import { EvotorController } from './evotor.controller';
import { EvotorService } from './evotor.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Reflector } from '@nestjs/core';

describe('EvotorController', () => {
  let controller: EvotorController;
  let evotorService: DeepMocked<EvotorService>;

  beforeEach(() => {
    evotorService = createMock<EvotorService>();
    controller = new EvotorController(evotorService);
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
});
