import { CacheService } from '@/core/cache/cache.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Shop } from './entities/shop.entity';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    private readonly cacheService: CacheService,
  ) {}

  async create(createShopDto: CreateShopDto): Promise<Shop> {
    const existingShop = await this.shopRepository.findOne({
      where: { slug: createShopDto.slug },
    });

    if (existingShop) {
      throw new ConflictException('Shop with this slug already exists');
    }

    const shop = this.shopRepository.create({
      ...createShopDto,
    });
    const savedShop = await this.shopRepository.save(shop);
    await this.invalidateShopCache(savedShop.id, savedShop.slug);
    return savedShop;
  }

  async findBySlug(slug: string): Promise<Shop> {
    const cacheKey = this.cacheService.generateKey('shop', 'slug', slug);
    const cached = await this.cacheService.get<Shop>(cacheKey);
    if (cached) {
      return cached;
    }

    const shop = await this.shopRepository.findOne({ where: { slug } });

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

    const shop = await this.shopRepository.findOne({ where: { id } });

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

    const shop = await this.shopRepository.findOne({ where: { ownerId } });

    if (shop) {
      await this.cacheService.set(cacheKey, shop, 600);
    }

    return shop;
  }

  async update(id: string, updateShopDto: UpdateShopDto): Promise<Shop> {
    const shop = await this.findById(id);

    Object.assign(shop, updateShopDto);
    const updated = await this.shopRepository.save(shop);
    await this.invalidateShopCache(updated.id, updated.slug);
    return updated;
  }

  async updateOwner(id: string, ownerId: string): Promise<Shop> {
    const shop = await this.findById(id);

    shop.ownerId = ownerId;
    const updated = await this.shopRepository.save(shop);
    await this.invalidateShopCache(updated.id, updated.slug);
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
    await this.invalidateShopCache(updated.id, updated.slug);
    return updated;
  }

  async toggleActive(id: string): Promise<Shop> {
    const shop = await this.findById(id);

    shop.isActive = !shop.isActive;
    const updated = await this.shopRepository.save(shop);
    await this.invalidateShopCache(updated.id, updated.slug);
    return updated;
  }

  private async invalidateShopCache(shopId: string, slug?: string): Promise<void> {
    await this.cacheService.del(this.cacheService.generateKey('shop', 'id', shopId));
    if (slug) {
      await this.cacheService.del(this.cacheService.generateKey('shop', 'slug', slug));
    }
  }
}
