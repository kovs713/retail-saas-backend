import { RegistrationStatus } from '@/common/enums';
import { Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { CreateRegistrationApplicationDto } from './dto';
import { RegistrationApplication } from './entities';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class RegistrationApplicationService {
  constructor(
    @InjectRepository(RegistrationApplication)
    private readonly repository: Repository<RegistrationApplication>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    registerDto: CreateRegistrationApplicationDto,
  ): Promise<RegistrationApplication> {
    const existingPendingApplication = await this.repository.findOne({
      where: [
        { email: registerDto.email, status: RegistrationStatus.PENDING },
        { shopSlug: registerDto.shopSlug, status: RegistrationStatus.PENDING },
      ],
    });

    if (existingPendingApplication) {
      throw new ConflictException(
        'Pending registration application with this email or shop slug already exists',
      );
    }

    const [existingUser, existingShop] = await Promise.all([
      this.dataSource
        .getRepository(User)
        .findOne({ where: { email: registerDto.email } }),
      this.dataSource
        .getRepository(Shop)
        .findOne({ where: { slug: registerDto.shopSlug } }),
    ]);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    if (existingShop) {
      throw new ConflictException('Shop slug already exists');
    }

    const passwordHash = await hash(registerDto.password, 10);
    const application = this.repository.create({
      email: registerDto.email,
      passwordHash,
      shopName: registerDto.shopName,
      shopSlug: registerDto.shopSlug,
      shopDescription: registerDto.shopDescription ?? null,
      shopAddress: registerDto.shopAddress ?? null,
      shopPhone: registerDto.shopPhone ?? null,
      shopWorkingHours: registerDto.shopWorkingHours ?? null,
      status: RegistrationStatus.PENDING,
      rejectionReason: null,
      reviewedAt: null,
      approvedShopId: null,
      approvedUserId: null,
    });

    return this.repository.save(application);
  }

  async list(status?: RegistrationStatus): Promise<RegistrationApplication[]> {
    if (status) {
      return this.repository.find({
        order: {
          createdAt: 'DESC',
        },
        where: {
          status: status,
        },
      });
    }
    return this.repository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async approve(id: string): Promise<RegistrationApplication> {
    const application = await this.findPending(id);

    const approved = await this.dataSource.transaction(async (manager) => {
      const shopRepository = manager.getRepository(Shop);
      const userRepository = manager.getRepository(User);
      const applicationRepository = manager.getRepository(
        RegistrationApplication,
      );

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

      application.status = RegistrationStatus.APPROVED;
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
    application.status = RegistrationStatus.REJECTED;
    application.reviewedAt = new Date();
    application.rejectionReason = reason ?? null;
    return this.repository.save(application);
  }

  private async findPending(id: string): Promise<RegistrationApplication> {
    const application = await this.repository.findOne({
      where: {
        id,
      },
    });

    if (!application) {
      throw new NotFoundException('Registration application not found');
    }

    if (application.status !== RegistrationStatus.PENDING) {
      throw new ConflictException('Registration application already reviewed');
    }

    return application;
  }
}
