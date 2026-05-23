import { CacheService } from '@/core/cache/cache.service';
import { ShopRepository } from '@/modules/shop/repositories';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from './entities';
import { FindAllUsersQuery } from './repositories/types';
import { UserRepository } from './repositories';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly shopRepository: ShopRepository,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
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

  async findAllPaginated(query: FindAllUsersQuery) {
    return this.userRepository.findAllPaginated(query);
  }

  async hardDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    const ownedShop = await this.shopRepository.findByOwnerId(id);
    const usersToInvalidate = ownedShop
      ? await this.userRepository.findByShopId(ownedShop.id)
      : [user];

    if (!usersToInvalidate.some((u) => u.id === user.id)) {
      usersToInvalidate.push(user);
    }

    await this.dataSource.transaction(async (manager) => {
      if (ownedShop) {
        await this.deleteOwnedShopData(manager, id, ownedShop.id, {
          slug: ownedShop.slug,
          userIds: usersToInvalidate.map((u) => u.id),
          emails: usersToInvalidate.map((u) => u.email),
        });
        return;
      }

      await this.deleteUserData(manager, id, user.email);
      await this.deleteWhere(manager, 'users', 'id = :userId', { userId: id });
    });

    await Promise.all(
      usersToInvalidate.map((u) => this.invalidateUserCache(u.id, u.email)),
    );
  }

  private async deleteOwnedShopData(
    manager: EntityManager,
    ownerId: string,
    shopId: string,
    related: { slug: string; userIds: string[]; emails: string[] },
  ): Promise<void> {
    await manager.update('shops', { id: shopId }, { ownerId: null });

    await this.deleteWhere(
      manager,
      'chat_messages',
      '"sessionId" IN (SELECT id FROM chat_sessions WHERE "shopId" = :shopId OR "userId" = :ownerId)',
      { shopId, ownerId },
    );
    await this.deleteWhere(
      manager,
      'chat_sessions',
      '"shopId" = :shopId OR "userId" = :ownerId',
      { shopId, ownerId },
    );

    await this.deleteWhere(
      manager,
      'evotor_applications',
      '"shopId" = :shopId OR "userId" = :ownerId',
      { shopId, ownerId },
    );
    await this.deleteWhere(
      manager,
      'evotor_integrations',
      '"shopId" = :shopId',
      {
        shopId,
      },
    );

    await this.deleteWhere(manager, 'product_images', '"shopId" = :shopId', {
      shopId,
    });
    await this.deleteWhere(manager, 'products', '"shopId" = :shopId', {
      shopId,
    });
    await this.deleteWhere(manager, 'categories', '"shopId" = :shopId', {
      shopId,
    });

    await this.deleteWhere(manager, 'locations', '"shopId" = :shopId', {
      shopId,
    });
    await this.deleteWhere(manager, 'orders', '"shopId" = :shopId', { shopId });
    await this.deleteWhere(manager, 'chat_events', '"shopId" = :shopId', {
      shopId,
    });
    await this.deleteWhere(manager, 'storefront_views', '"shopId" = :shopId', {
      shopId,
    });

    await this.deleteRegistrationApplications(manager, {
      shopId,
      slug: related.slug,
      userIds: related.userIds,
      emails: related.emails,
    });

    await this.deleteWhere(
      manager,
      'users',
      'id = :ownerId OR "shopId" = :shopId',
      { ownerId, shopId },
    );
    await this.deleteWhere(manager, 'shops', 'id = :shopId', { shopId });
  }

  private async deleteUserData(
    manager: EntityManager,
    userId: string,
    email: string,
  ): Promise<void> {
    await this.deleteWhere(
      manager,
      'chat_messages',
      '"sessionId" IN (SELECT id FROM chat_sessions WHERE "userId" = :userId)',
      { userId },
    );
    await this.deleteWhere(manager, 'chat_sessions', '"userId" = :userId', {
      userId,
    });
    await this.deleteWhere(
      manager,
      'evotor_applications',
      '"userId" = :userId',
      {
        userId,
      },
    );
    await this.deleteRegistrationApplications(manager, {
      userIds: [userId],
      emails: [email],
    });
  }

  private async deleteRegistrationApplications(
    manager: EntityManager,
    params: {
      shopId?: string;
      slug?: string;
      userIds?: string[];
      emails?: string[];
    },
  ): Promise<void> {
    const where: string[] = [];
    const queryParams: Record<string, string | string[]> = {};

    if (params.shopId) {
      where.push('"approvedShopId" = :shopId');
      queryParams.shopId = params.shopId;
    }

    if (params.slug) {
      where.push('"shopSlug" = :slug');
      queryParams.slug = params.slug;
    }

    if (params.userIds?.length) {
      where.push('"approvedUserId" IN (:...userIds)');
      queryParams.userIds = params.userIds;
    }

    if (params.emails?.length) {
      where.push('email IN (:...emails)');
      queryParams.emails = params.emails;
    }

    if (!where.length) {
      return;
    }

    await this.deleteWhere(
      manager,
      'registration_applications',
      where.join(' OR '),
      queryParams,
    );
  }

  private async deleteWhere(
    manager: EntityManager,
    table: string,
    where: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .delete()
      .from(table)
      .where(where, params)
      .execute();
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
