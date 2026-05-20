import { EvotorApplication } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EvotorApplicationRepository extends Repository<EvotorApplication> {
  constructor(
    @InjectRepository(EvotorApplication)
    private readonly repository: Repository<EvotorApplication>,
  ) {
    super(EvotorApplication, repository.manager);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }
}
