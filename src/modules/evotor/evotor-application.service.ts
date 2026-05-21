import { RegistrationStatus } from '@/common/enums';
import { ShopService } from '@/modules/shop/shop.service';
import { User } from '@/modules/user/entities';
import { UserService } from '@/modules/user/user.service';
import { CreateEvotorApplicationDto } from './dto';
import { EvotorApplication } from './entities';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class EvotorApplicationService {
  constructor(
    @InjectRepository(EvotorApplication)
    private readonly repository: Repository<EvotorApplication>,
    private readonly dataSource: DataSource,
    private readonly shopService: ShopService,
    private readonly userService: UserService,
  ) {}

  async create(
    shopId: string,
    payload: CreateEvotorApplicationDto,
  ): Promise<EvotorApplication> {
    const shop = await this.shopService.findById(shopId);

    if (!shop.ownerId) {
      throw new BadRequestException('Shop owner is required');
    }

    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: shop.ownerId } });

    if (!user) {
      throw new NotFoundException('Shop owner not found');
    }

    if (user.evotorUserId) {
      throw new ConflictException('User already has Evotor account linked');
    }

    const existingUser = await this.userService.findByEvotorUserId(
      payload.evotor_user_id,
    );

    if (existingUser) {
      throw new ConflictException('Evotor user already linked');
    }

    const existingApplication = await this.repository.findOne({
      where: [
        { userId: user.id, status: RegistrationStatus.PENDING },
        {
          evotorUserId: payload.evotor_user_id,
          status: RegistrationStatus.PENDING,
        },
        {
          evotorUserId: payload.evotor_user_id,
          status: RegistrationStatus.APPROVED,
        },
      ],
    });

    if (existingApplication) {
      throw new ConflictException('Evotor application already exists');
    }

    const application = this.repository.create({
      userId: user.id,
      shopId,
      evotorUserId: payload.evotor_user_id,
      status: RegistrationStatus.PENDING,
      rejectionReason: null,
      reviewedAt: null,
    });

    return this.repository.save(application);
  }

  async list(status?: RegistrationStatus): Promise<EvotorApplication[]> {
    if (status) {
      return this.repository.find({
        order: { createdAt: 'DESC' },
        where: { status },
      });
    }

    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async approve(id: string): Promise<EvotorApplication> {
    const { application, user } = await this.dataSource.transaction(
      async (manager) => {
        const applicationRepository = manager.getRepository(EvotorApplication);
        const userRepository = manager.getRepository(User);
        const application = await this.findPending(id, applicationRepository);
        const user = await userRepository.findOne({
          where: { id: application.userId },
        });

        if (!user) {
          throw new NotFoundException('Application user not found');
        }

        if (
          user.evotorUserId &&
          user.evotorUserId !== application.evotorUserId
        ) {
          throw new ConflictException('User already has Evotor account linked');
        }

        const existingUser = await userRepository.findOne({
          where: { evotorUserId: application.evotorUserId },
        });

        if (existingUser && existingUser.id !== user.id) {
          throw new ConflictException('Evotor user already linked');
        }

        user.evotorUserId = application.evotorUserId;
        const savedUser = await userRepository.save(user);

        application.status = RegistrationStatus.APPROVED;
        application.reviewedAt = new Date();
        application.rejectionReason = null;
        const savedApplication = await applicationRepository.save(application);

        return { application: savedApplication, user: savedUser };
      },
    );

    await this.userService.invalidateCache(user);

    return application;
  }

  async reject(id: string, reason?: string): Promise<EvotorApplication> {
    const application = await this.findPending(id, this.repository);
    application.status = RegistrationStatus.REJECTED;
    application.reviewedAt = new Date();
    application.rejectionReason = reason ?? null;
    return this.repository.save(application);
  }

  private async findPending(
    id: string,
    repository: Repository<EvotorApplication>,
  ): Promise<EvotorApplication> {
    const application = await repository.findOne({ where: { id } });

    if (!application) {
      throw new NotFoundException('Evotor application not found');
    }

    if (application.status !== RegistrationStatus.PENDING) {
      throw new ConflictException('Evotor application already reviewed');
    }

    return application;
  }
}
