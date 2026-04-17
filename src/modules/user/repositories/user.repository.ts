import { User } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {
    super(User, repository.manager);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: {
        email,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: {
        id,
      },
    });
  }

  async findByShopId(shopId: string): Promise<User[]> {
    return this.repository.find({
      where: {
        shopId,
      },
      relations: ['shop'],
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.repository.existsBy({ email });
  }

  async existsByEmailAndNotId(email: string, id: string): Promise<boolean> {
    return this.repository.existsBy({
      email,
      id: Not(id),
    });
  }
}
