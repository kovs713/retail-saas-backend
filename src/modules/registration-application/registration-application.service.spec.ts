import { RegistrationStatus } from '@/common/enums';
import { Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { RegistrationApplication } from './entities/registration-application.entity';
import { RegistrationApplicationService } from './registration-application.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

describe('RegistrationApplicationService', () => {
  let service: RegistrationApplicationService;
  let repository: DeepMocked<Repository<RegistrationApplication>>;
  let dataSource: DeepMocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationApplicationService,
        {
          provide: getRepositoryToken(RegistrationApplication),
          useValue: createMock<Repository<RegistrationApplication>>(),
        },
        {
          provide: DataSource,
          useValue: createMock<DataSource>(),
        },
      ],
    }).compile();

    service = module.get<RegistrationApplicationService>(RegistrationApplicationService);
    repository = module.get<DeepMocked<Repository<RegistrationApplication>>>(
      getRepositoryToken(RegistrationApplication),
    );
    dataSource = module.get<DeepMocked<DataSource>>(DataSource);
  });

  it('creates a pending registration application', async () => {
    const userRepository = createMock<Repository<User>>();
    const shopRepository = createMock<Repository<Shop>>();

    repository.findOne.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue(null);
    shopRepository.findOne.mockResolvedValue(null);
    dataSource.getRepository.mockReturnValueOnce(userRepository as never).mockReturnValueOnce(shopRepository as never);
    repository.create.mockImplementation((value) => value as never);
    repository.save.mockImplementation((value) => value as never);

    const result = await service.create({
      email: 'new@example.com',
      password: 'password123',
      shopName: 'New Shop',
      shopSlug: 'new-shop',
    });

    expect(result.status).toBe(RegistrationStatus.PENDING);
    expect(result.email).toBe('new@example.com');
    expect(result.passwordHash).toBeDefined();
  });

  it('rejects duplicate pending applications by email or slug', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1' } as RegistrationApplication);

    await expect(
      service.create({
        email: 'new@example.com',
        password: 'password123',
        shopName: 'New Shop',
        shopSlug: 'new-shop',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
