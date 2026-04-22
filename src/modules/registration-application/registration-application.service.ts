import { RegisterDto } from '@/core/auth/dto';
import { Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { RegistrationApplication } from './entities/registration-application.entity';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class RegistrationApplicationService {
  constructor(
    @InjectRepository(RegistrationApplication)
    private readonly registrationApplicationRepository: Repository<RegistrationApplication>,
    private readonly dataSource: DataSource,
  ) {}

  async create(registerDto: RegisterDto): Promise<RegistrationApplication> {
    const existingApplication = await this.registrationApplicationRepository.findOne({
      where: [{ email: registerDto.email }, { shopSlug: registerDto.shopSlug }],
    });

    if (existingApplication) {
      throw new ConflictException('Email or shop slug already exists');
    }

    const [existingUser, existingShop] = await Promise.all([
      this.dataSource.getRepository(User).findOne({ where: { email: registerDto.email } }),
      this.dataSource.getRepository(Shop).findOne({ where: { slug: registerDto.shopSlug } }),
    ]);

    if (existingUser || existingShop) {
      throw new ConflictException('Email or shop slug already exists');
    }

    const passwordHash = await hash(registerDto.password, 10);
    const application = this.registrationApplicationRepository.create({
      email: registerDto.email,
      passwordHash,
      shopName: registerDto.shopName,
      shopSlug: registerDto.shopSlug,
      shopDescription: registerDto.shopDescription ?? null,
      shopAddress: registerDto.shopAddress ?? null,
      shopPhone: registerDto.shopPhone ?? null,
      shopWorkingHours: registerDto.shopWorkingHours ?? null,
      status: 'pending',
      rejectionReason: null,
      reviewedAt: null,
      approvedShopId: null,
      approvedUserId: null,
    });

    return this.registrationApplicationRepository.save(application);
  }

  async list(): Promise<RegistrationApplication[]> {
    return this.registrationApplicationRepository.find({ order: { createdAt: 'DESC' } });
  }

  async approve(id: string): Promise<RegistrationApplication> {
    const application = await this.findPending(id);

    const approved = await this.dataSource.transaction(async (manager) => {
      const shopRepository = manager.getRepository(Shop);
      const userRepository = manager.getRepository(User);
      const applicationRepository = manager.getRepository(RegistrationApplication);

      const shop = await shopRepository.save(
        shopRepository.create({
          name: application.shopName,
          slug: application.shopSlug,
          description: application.shopDescription,
          address: application.shopAddress,
          phone: application.shopPhone,
          workingHours: application.shopWorkingHours,
          isActive: true,
        }),
      );

      const user = await userRepository.save(
        userRepository.create({
          email: application.email,
          passwordHash: application.passwordHash,
          role: 'owner',
          shopId: shop.id,
          isActive: true,
        }),
      );

      shop.ownerId = user.id;
      await shopRepository.save(shop);

      application.status = 'approved';
      application.reviewedAt = new Date();
      application.rejectionReason = null;
      application.approvedShopId = shop.id;
      application.approvedUserId = user.id;

      return applicationRepository.save(application);
    });

    return approved;
  }

  async reject(id: string, reason?: string): Promise<RegistrationApplication> {
    const application = await this.findPending(id);
    application.status = 'rejected';
    application.reviewedAt = new Date();
    application.rejectionReason = reason ?? null;
    return this.registrationApplicationRepository.save(application);
  }

  private async findPending(id: string): Promise<RegistrationApplication> {
    const application = await this.registrationApplicationRepository.findOne({ where: { id } });

    if (!application) {
      throw new NotFoundException('Registration application not found');
    }

    if (application.status !== 'pending') {
      throw new ConflictException('Registration application already reviewed');
    }

    return application;
  }
}
