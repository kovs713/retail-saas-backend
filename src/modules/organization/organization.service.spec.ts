import { OrganizationService, CreateOrganizationDto, UpdateOrganizationDto } from './organization.service';
import { Organization } from './entities/organization.entity';

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { Repository } from 'typeorm';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let repository: ReturnType<typeof createMock<Repository<Organization>>>;

  const mockOrganization: Organization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    isActive: true,
    metadata: { test: true },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: getRepositoryToken(Organization),
          useValue: createMock<Repository<Organization>>(),
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    repository = module.get(getRepositoryToken(Organization));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateOrganizationDto = {
      name: 'Test Organization',
      slug: 'test-org',
      metadata: { test: true },
    };

    it('should create organization with unique slug', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockOrganization);
      repository.save.mockResolvedValue(mockOrganization);

      const result = await service.create(createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { slug: createDto.slug },
      });
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockOrganization);
    });

    it('should throw ConflictException for duplicate slug', async () => {
      repository.findOne.mockResolvedValue(mockOrganization);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Organization with slug "${createDto.slug}" already exists`,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated organizations', async () => {
      repository.findAndCount.mockResolvedValue([[mockOrganization], 1]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: [mockOrganization],
        total: 1,
      });
      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should use default pagination values', async () => {
      repository.findAndCount.mockResolvedValue([[mockOrganization], 1]);

      await service.findAll();

      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return organization by ID', async () => {
      repository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findOne('org-123');

      expect(result).toEqual(mockOrganization);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-123' },
      });
    });

    it('should throw NotFoundException for invalid ID', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(`Organization with ID "invalid-id" not found`);
    });
  });

  describe('update', () => {
    const updateDto: UpdateOrganizationDto = {
      name: 'Updated Organization',
    };

    it('should update organization metadata', async () => {
      repository.findOne.mockResolvedValue(mockOrganization);
      repository.save.mockResolvedValue({ ...mockOrganization, ...updateDto });

      const result = await service.update('org-123', updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Organization');
    });

    it('should throw NotFoundException for non-existent organization', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate slug', async () => {
      const existingOrg = { ...mockOrganization, id: 'org-456' };
      repository.findOne.mockResolvedValueOnce(mockOrganization);
      repository.findOne.mockResolvedValueOnce(existingOrg);

      await expect(service.update('org-123', { slug: 'duplicate-slug' })).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      repository.findOne.mockResolvedValue(mockOrganization);
      repository.save.mockResolvedValue({ ...mockOrganization, isActive: false });

      const result = await service.deactivate('org-123');

      expect(result.isActive).toBe(false);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent organization', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('should set isActive to true', async () => {
      const inactiveOrg = { ...mockOrganization, isActive: false };
      repository.findOne.mockResolvedValue(inactiveOrg);
      repository.save.mockResolvedValue({ ...mockOrganization, isActive: true });

      const result = await service.activate('org-123');

      expect(result.isActive).toBe(true);
    });
  });

  describe('findBySlug', () => {
    it('should return organization by slug', async () => {
      repository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findBySlug('test-org');

      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException for invalid slug', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('invalid-slug')).rejects.toThrow(NotFoundException);
    });
  });
});
