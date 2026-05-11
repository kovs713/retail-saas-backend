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
}
