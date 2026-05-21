import { EvotorApplication } from '@/modules/evotor/entities';
import { EvotorApplicationRepository } from '@/modules/evotor/repositories';
import { ChatSession } from '@/modules/rag/chat/entities';
import { ChatSessionRepository } from '@/modules/rag/chat/repositories';
import { Shop } from '@/modules/shop/entities';
import { ShopRepository } from '@/modules/shop/repositories';
import { User } from './entities';
import { UserRepository } from './repositories';
import { UserService } from './user.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Shop, ChatSession, EvotorApplication]),
  ],
  providers: [
    UserService,
    UserRepository,
    ShopRepository,
    ChatSessionRepository,
    EvotorApplicationRepository,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
