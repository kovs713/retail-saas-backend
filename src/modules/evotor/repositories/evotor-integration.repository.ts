import { EvotorIntegration } from '../entities';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export class EvotorIntegrationRepository extends Repository<EvotorIntegration> {
  constructor(
    @InjectRepository(EvotorIntegration)
    private readonly repository: Repository<EvotorIntegration>,
  ) {
    super(EvotorIntegration, repository.manager);
  }

  async findAll(): Promise<EvotorIntegration[]> {
    return this.repository.find();
  }

  async findById(id: string, shopId: string): Promise<EvotorIntegration[]> {
    return this.repository.findBy({
      id: id,
      shopId: shopId,
    });
  }

  async countActive(): Promise<number> {
    return this.repository.count({ where: { status: 'connected' } });
  }

  async countByStatus(status: string): Promise<number> {
    return this.repository.count({ where: { status } });
  }

  async findRecent(limit: number = 10): Promise<EvotorIntegration[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
