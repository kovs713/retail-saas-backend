import { CacheService } from '@/core/cache/cache.service';
import { CreateShopDto, UpdateShopDto } from './dto';
import { Shop } from './entities';
import { ShopRepository } from './repository';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ShopService {
  constructor(
    private readonly shopRepository: ShopRepository,
    private readonly cacheService: CacheService,
  ) {}

  async create(createShopDto: CreateShopDto): Promise<Shop> {
    const existingShop = await this.shopRepository.existsBySlug(createShopDto.slug);

    if (existingShop) {
      throw new ConflictException('Shop with this slug already exists');
    }

    const shop = this.shopRepository.create({
      ...createShopDto,
    });
    const savedShop = await this.shopRepository.save(shop);
    await this.invalidateShopCache(savedShop.id, {
      slug: savedShop.slug,
      ownerId: savedShop.ownerId,
    });
    return savedShop;
  }

  async findBySlug(slug: string): Promise<Shop> {
    const cacheKey = this.cacheService.generateKey('shop', 'slug', slug);
    const cached = await this.cacheService.get<Shop>(cacheKey);
    if (cached) {
      return cached;
    }

    const shop = await this.shopRepository.findBySlug(slug);

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    await this.cacheService.set(cacheKey, shop, 600);

    return shop;
  }

  async findById(id: string): Promise<Shop> {
    const cacheKey = this.cacheService.generateKey('shop', 'id', id);
    const cached = await this.cacheService.get<Shop>(cacheKey);
    if (cached) {
      return cached;
    }

    const shop = await this.shopRepository.findById(id);

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    await this.cacheService.set(cacheKey, shop, 600);

    return shop;
  }

  async findByOwnerId(ownerId: string): Promise<Shop | null> {
    const cacheKey = this.cacheService.generateKey('shop', 'owner', ownerId);
    const cached = await this.cacheService.get<Shop>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const shop = await this.shopRepository.findByOwnerId(ownerId);

    if (shop) {
      await this.cacheService.set(cacheKey, shop, 600);
    }

    return shop;
  }

  async update(id: string, updateShopDto: UpdateShopDto): Promise<Shop> {
    const shop = await this.findById(id);
    const previousSlug = shop.slug;
    const previousOwnerId = shop.ownerId;

    Object.assign(shop, updateShopDto);
    const updated = await this.shopRepository.save(shop);
    await this.invalidateShopCache(updated.id, {
      slug: updated.slug,
      previousSlug,
      ownerId: updated.ownerId,
      previousOwnerId,
    });
    return updated;
  }

  async updateOwner(id: string, ownerId: string): Promise<Shop> {
    const shop = await this.findById(id);
    const previousOwnerId = shop.ownerId;

    shop.ownerId = ownerId;
    const updated = await this.shopRepository.save(shop);
    await this.invalidateShopCache(updated.id, {
      slug: updated.slug,
      ownerId: updated.ownerId,
      previousOwnerId,
    });
    return updated;
  }

  async updateMediaUrls(id: string, logoUrl?: string, bannerUrl?: string): Promise<Shop> {
    const shop = await this.findById(id);

    if (logoUrl) {
      shop.logoUrl = logoUrl;
    }

    if (bannerUrl) {
      shop.bannerUrl = bannerUrl;
    }

    const updated = await this.shopRepository.save(shop);
    await this.invalidateShopCache(updated.id, {
      slug: updated.slug,
      ownerId: updated.ownerId,
    });
    return updated;
  }

  async toggleActive(id: string): Promise<Shop> {
    const shop = await this.findById(id);

    shop.isActive = !shop.isActive;
    const updated = await this.shopRepository.save(shop);
    await this.invalidateShopCache(updated.id, {
      slug: updated.slug,
      ownerId: updated.ownerId,
    });
    return updated;
  }

  private async invalidateShopCache(
    shopId: string,
    keys?: { slug?: string; previousSlug?: string; ownerId?: string | null; previousOwnerId?: string | null },
  ): Promise<void> {
    await this.cacheService.del(this.cacheService.generateKey('shop', 'id', shopId));
    if (keys?.slug) {
      await this.cacheService.del(this.cacheService.generateKey('shop', 'slug', keys.slug));
    }
    if (keys?.previousSlug && keys.previousSlug !== keys.slug) {
      await this.cacheService.del(this.cacheService.generateKey('shop', 'slug', keys.previousSlug));
    }
    if (keys?.ownerId) {
      await this.cacheService.del(this.cacheService.generateKey('shop', 'owner', keys.ownerId));
    }
    if (keys?.previousOwnerId && keys.previousOwnerId !== keys.ownerId) {
      await this.cacheService.del(this.cacheService.generateKey('shop', 'owner', keys.previousOwnerId));
    }
  }
}
