import { RegistrationStatus } from '@/common/enums';
import { ShopService } from '@/modules/shop/shop.service';
import { User } from '@/modules/user/entities';
import { UserService } from '@/modules/user/user.service';
import { EvotorApplication } from './entities';
import { EvotorApplicationService } from './evotor-application.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

describe('EvotorApplicationService', () => {
  let service: EvotorApplicationService;
  let repository: DeepMocked<Repository<EvotorApplication>>;
  let dataSource: DeepMocked<DataSource>;
  let shopService: DeepMocked<ShopService>;
  let userService: DeepMocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvotorApplicationService,
        {
          provide: getRepositoryToken(EvotorApplication),
          useValue: createMock<Repository<EvotorApplication>>(),
        },
        { provide: DataSource, useValue: createMock<DataSource>() },
        { provide: ShopService, useValue: createMock<ShopService>() },
        { provide: UserService, useValue: createMock<UserService>() },
      ],
    }).compile();

    service = module.get(EvotorApplicationService);
    repository = module.get(getRepositoryToken(EvotorApplication));
    dataSource = module.get(DataSource);
    shopService = module.get(ShopService);
    userService = module.get(UserService);
  });

  it('creates a pending Evotor application for shop owner', async () => {
    const userRepository = createMock<Repository<User>>();

    shopService.findById.mockResolvedValue({
      id: 'shop-1',
      ownerId: 'user-1',
    } as never);
    dataSource.getRepository.mockReturnValue(userRepository as never);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      evotorUserId: null,
    } as never);
    userService.findByEvotorUserId.mockResolvedValue(null);
    repository.findOne.mockResolvedValue(null);
    repository.create.mockImplementation((value) => value as never);
    repository.save.mockImplementation((value) =>
      Promise.resolve(value as EvotorApplication),
    );

    const result = await service.create('shop-1', {
      evotor_user_id: 'evotor-user-1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        shopId: 'shop-1',
        evotorUserId: 'evotor-user-1',
        status: RegistrationStatus.PENDING,
      }),
    );
  });

  it('rejects create when Evotor user is already linked', async () => {
    const userRepository = createMock<Repository<User>>();

    shopService.findById.mockResolvedValue({
      id: 'shop-1',
      ownerId: 'user-1',
    } as never);
    dataSource.getRepository.mockReturnValue(userRepository as never);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      evotorUserId: null,
    } as never);
    userService.findByEvotorUserId.mockResolvedValue({
      id: 'user-2',
    } as never);

    await expect(
      service.create('shop-1', { evotor_user_id: 'evotor-user-1' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('approves application and binds Evotor user id', async () => {
    const applicationRepository = createMock<Repository<EvotorApplication>>();
    const userRepository = createMock<Repository<User>>();
    const manager = createMock<EntityManager>();
    const application = {
      id: 'application-1',
      userId: 'user-1',
      shopId: 'shop-1',
      evotorUserId: 'evotor-user-1',
      status: RegistrationStatus.PENDING,
      rejectionReason: null,
      reviewedAt: null,
    } as EvotorApplication;
    const user = {
      id: 'user-1',
      email: 'owner@test.com',
      evotorUserId: null,
    } as User;

    manager.getRepository.mockImplementation((entity) => {
      if (entity === EvotorApplication) {
        return applicationRepository as never;
      }
      return userRepository as never;
    });
    dataSource.transaction.mockImplementation((async (
      callback: (entityManager: EntityManager) => Promise<unknown>,
    ) => {
      const result = await callback(manager);
      return result;
    }) as never);
    applicationRepository.findOne.mockResolvedValue(application);
    userRepository.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);
    userRepository.save.mockImplementation((value) =>
      Promise.resolve(value as User),
    );
    applicationRepository.save.mockImplementation((value) =>
      Promise.resolve(value as EvotorApplication),
    );

    const result = await service.approve('application-1');

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ evotorUserId: 'evotor-user-1' }),
    );
    expect(userService.invalidateCache).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
    );
    expect(result.status).toBe(RegistrationStatus.APPROVED);
  });

  it('rejects a pending application', async () => {
    repository.findOne.mockResolvedValue({
      id: 'application-1',
      status: RegistrationStatus.PENDING,
      rejectionReason: null,
      reviewedAt: null,
    } as EvotorApplication);
    repository.save.mockImplementation((value) =>
      Promise.resolve(value as EvotorApplication),
    );

    const result = await service.reject('application-1', 'bad account');

    expect(result.status).toBe(RegistrationStatus.REJECTED);
    expect(result.rejectionReason).toBe('bad account');
  });
});
