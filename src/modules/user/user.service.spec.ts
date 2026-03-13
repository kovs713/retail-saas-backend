import { Organization } from '../organization/entities/organization.entity';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, UserService } from './user.service';

import { createMock } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { Repository } from 'typeorm';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UserService', () => {
  let service: UserService;
  let repository: ReturnType<typeof createMock<Repository<User>>>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'member',
    isActive: true,
    organizationId: 'org-456',
    organization: null as unknown as Organization,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMock<Repository<User>>(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      role: 'member',
      organizationId: 'org-456',
    };

    it('should create user with hashed password', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      const result = await service.create(createDto);

      expect(bcryptjs.hash).toHaveBeenCalledWith(createDto.password, 10);
      expect(repository.create).toHaveBeenCalledWith({
        email: createDto.email,
        passwordHash: 'hashed-password',
        role: 'member',
        organizationId: createDto.organizationId,
      });
      expect(result).toEqual(mockUser);
    });

    it('should use default role "member" when not provided', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      await service.create({ ...createDto, role: undefined });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'member',
        }),
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(`User with email "${createDto.email}" already exists`);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw NotFoundException for non-existent email', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByEmail('nonexistent@example.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByOrganization', () => {
    it('should return all users in organization', async () => {
      repository.find.mockResolvedValue([mockUser]);

      const result = await service.findByOrganization('org-456');

      expect(result).toHaveLength(1);
      expect(repository.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-456' },
        relations: ['organization'],
      });
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue({ ...mockUser, role: 'admin' });

      const result = await service.updateRole('user-123', 'admin');

      expect(result.role).toBe('admin');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateRole('invalid-id', 'admin')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.deactivate('user-123');

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('should set isActive to true', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      repository.findOne.mockResolvedValue(inactiveUser);
      repository.save.mockResolvedValue({ ...mockUser, isActive: true });

      const result = await service.activate('user-123');

      expect(result.isActive).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should compare password hash correctly', async () => {
      const result = await service.validatePassword(mockUser, 'password123');

      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(mockUser, 'wrong-password');

      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      email: 'updated@example.com',
    };

    it('should update user email', async () => {
      repository.findOne.mockResolvedValueOnce(mockUser);
      repository.findOne.mockResolvedValueOnce(null);
      repository.save.mockResolvedValue({ ...mockUser, email: updateDto.email! });

      const result = await service.update('user-123', updateDto);

      expect(result.email).toBe('updated@example.com');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      const existingUser = { ...mockUser, id: 'user-456' };
      repository.findOne.mockResolvedValueOnce(mockUser);
      repository.findOne.mockResolvedValueOnce(existingUser);

      await expect(service.update('user-123', { email: 'duplicate@example.com' })).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });
});
