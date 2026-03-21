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
    return await this.shopRepository.save(shop);
  }

  async findBySlug(slug: string): Promise<Shop> {
    const shop = await this.shopRepository.findOne({ where: { slug } });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  async findById(id: string): Promise<Shop> {
    const shop = await this.shopRepository.findOne({ where: { id } });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  async findByOwnerId(ownerId: string): Promise<Shop | null> {
    return await this.shopRepository.findOne({ where: { ownerId } });
  }

  async update(id: string, updateShopDto: UpdateShopDto): Promise<Shop> {
    const shop = await this.findById(id);

    Object.assign(shop, updateShopDto);
    return await this.shopRepository.save(shop);
  }

  async updateOwner(id: string, ownerId: string): Promise<Shop> {
    const shop = await this.findById(id);

    shop.ownerId = ownerId;
    return await this.shopRepository.save(shop);
  }

  async updateMediaUrls(id: string, logoUrl?: string, bannerUrl?: string): Promise<Shop> {
    const shop = await this.findById(id);

    if (logoUrl) {
      shop.logoUrl = logoUrl;
    }

    if (bannerUrl) {
      shop.bannerUrl = bannerUrl;
    }

    return await this.shopRepository.save(shop);
  }

  async toggleActive(id: string): Promise<Shop> {
    const shop = await this.findById(id);

    shop.isActive = !shop.isActive;
    return await this.shopRepository.save(shop);
  }
}
