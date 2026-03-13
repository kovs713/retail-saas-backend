import { User } from './entities/user.entity';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';

export interface CreateUserDto {
  email: string;
  password: string;
  role?: string;
  organizationId: string;
}

export interface UpdateUserDto {
  email?: string;
  role?: string;
  isActive?: boolean;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createDto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: createDto.email },
    });

    if (existing) {
      throw new ConflictException(`User with email "${createDto.email}" already exists`);
    }

    const passwordHash = await hash(createDto.password, 10);

    const user = this.userRepository.create({
      email: createDto.email,
      passwordHash,
      role: createDto.role || 'member',
      organizationId: createDto.organizationId,
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }

    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId },
      relations: ['organization'],
    });
  }

  async updateRole(id: string, role: string): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.userRepository.save(user);
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = false;
    return this.userRepository.save(user);
  }

  async activate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = true;
    return this.userRepository.save(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return compare(password, user.passwordHash);
  }

  async update(id: string, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateDto.email && updateDto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: updateDto.email },
      });

      if (existing) {
        throw new ConflictException(`User with email "${updateDto.email}" already exists`);
      }
    }

    Object.assign(user, updateDto);
    return this.userRepository.save(user);
  }
}
