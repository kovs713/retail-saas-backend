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
        { provide: getRepositoryToken(RegistrationApplication), useValue: createMock<Repository<RegistrationApplication>>() },
        { provide: DataSource, useValue: createMock<DataSource>() },
      ],
    }).compile();

    service = module.get(RegistrationApplicationService);
    repository = module.get(getRepositoryToken(RegistrationApplication));
    dataSource = module.get(DataSource);
    dataSource.getRepository.mockImplementation(
      () =>
        ({
          findOne: jest.fn().mockResolvedValue(null),
        }) as any,
    );
  });

  it('creates a pending registration application', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.create.mockImplementation((value) => value as RegistrationApplication);
    repository.save.mockImplementation(async (value) => value as RegistrationApplication);

    const result = await service.create({
      email: 'new@example.com',
      password: 'password123',
      shopName: 'New Shop',
      shopSlug: 'new-shop',
    });

    expect(result.status).toBe('pending');
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
