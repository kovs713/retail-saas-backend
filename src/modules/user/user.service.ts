import { CacheService } from '@/core/cache/cache.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from './entities';
import { UserRepository } from './repositories';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheService: CacheService,
  ) {}

  async create(createDto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.existsByEmail(createDto.email);

    if (existing) {
      throw new ConflictException(
        `User with email "${createDto.email}" already exists`,
      );
    }

    const passwordHash = await hash(createDto.password, 10);

    const user = this.userRepository.create({
      email: createDto.email,
      passwordHash,
      role: createDto.role || 'owner',
      shopId: createDto.shopId || null,
    });

    const savedUser = await this.userRepository.save(user);
    await this.invalidateUserCache(savedUser.id, savedUser.email);

    return savedUser;
  }

  async findByEmail(email: string): Promise<User> {
    const cacheKey = this.cacheService.generateKey('user', 'email', email);
    const cached = await this.cacheService.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }

    await this.cacheService.set(cacheKey, user, 600);

    return user;
  }

  async findById(id: string): Promise<User> {
    const cacheKey = this.cacheService.generateKey('user', 'id', id);
    const cached = await this.cacheService.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    await this.cacheService.set(cacheKey, user, 600);

    return user;
  }

  async findByShop(shopId: string): Promise<User[]> {
    return this.userRepository.findByShopId(shopId);
  }

  async findByEvotorUserId(evotorUserId: string): Promise<User | null> {
    return this.userRepository.findByEvotorUserId(evotorUserId);
  }

  async updateRole(id: string, role: string): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    const updated = await this.userRepository.save(user);
    await this.invalidateUserCache(updated.id, updated.email);
    return updated;
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = false;
    const updated = await this.userRepository.save(user);
    await this.invalidateUserCache(updated.id, updated.email);
    return updated;
  }

  async activate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = true;
    const updated = await this.userRepository.save(user);
    await this.invalidateUserCache(updated.id, updated.email);
    return updated;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return compare(password, user.passwordHash);
  }

  async update(id: string, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateDto.email && updateDto.email !== user.email) {
      const existing = await this.userRepository.existsByEmailAndNotId(
        updateDto.email,
        id,
      );

      if (existing) {
        throw new ConflictException(
          `User with email "${updateDto.email}" already exists`,
        );
      }
    }

    Object.assign(user, updateDto);
    const updated = await this.userRepository.save(user);
    await this.invalidateUserCache(updated.id, updated.email);
    return updated;
  }

  async invalidateCache(user: Pick<User, 'id' | 'email'>): Promise<void> {
    await this.invalidateUserCache(user.id, user.email);
  }

  private async invalidateUserCache(
    userId: string,
    email?: string,
  ): Promise<void> {
    await this.cacheService.del(
      this.cacheService.generateKey('user', 'id', userId),
    );
    if (email) {
      await this.cacheService.del(
        this.cacheService.generateKey('user', 'email', email),
      );
    }
  }
}
