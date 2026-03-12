import { Organization } from './entities/organization.entity';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async create(createDto: CreateOrganizationDto): Promise<Organization> {
    const existing = await this.organizationRepository.findOne({
      where: { slug: createDto.slug },
    });

    if (existing) {
      throw new ConflictException(`Organization with slug "${createDto.slug}" already exists`);
    }

    const organization = this.organizationRepository.create(createDto);
    return this.organizationRepository.save(organization);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: Organization[]; total: number }> {
    const [data, total] = await this.organizationRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({ where: { id } });

    if (!organization) {
      throw new NotFoundException(`Organization with ID "${id}" not found`);
    }

    return organization;
  }

  async update(id: string, updateDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);

    if (updateDto.slug && updateDto.slug !== organization.slug) {
      const existing = await this.organizationRepository.findOne({
        where: { slug: updateDto.slug },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(`Organization with slug "${updateDto.slug}" already exists`);
      }
    }

    Object.assign(organization, updateDto);
    return this.organizationRepository.save(organization);
  }

  async deactivate(id: string): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.isActive = false;
    return this.organizationRepository.save(organization);
  }

  async activate(id: string): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.isActive = true;
    return this.organizationRepository.save(organization);
  }

  async findBySlug(slug: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({ where: { slug } });

    if (!organization) {
      throw new NotFoundException(`Organization with slug "${slug}" not found`);
    }

    return organization;
  }
}
