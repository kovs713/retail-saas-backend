import { User } from '../entities';
import { FindAllUsersQuery } from './types';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {
    super(User, repository.manager);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: {
        email,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: {
        id,
      },
      relations: ['shop'],
    });
  }

  async findByShopId(shopId: string): Promise<User[]> {
    return this.repository.find({
      where: {
        shopId,
      },
      relations: ['shop'],
    });
  }

  async findByEvotorUserId(evotorUserId: string): Promise<User | null> {
    return this.repository.findOne({
      where: {
        evotorUserId,
      },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.repository.existsBy({ email });
  }

  async existsByEmailAndNotId(email: string, id: string): Promise<boolean> {
    return this.repository.existsBy({
      email,
      id: Not(id),
    });
  }

  async findAllPaginated(query: FindAllUsersQuery) {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.email = ILike(`%${search}%`);
    }

    const [data, total] = await this.repository.findAndCount({
      where,
      relations: ['shop'],
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
