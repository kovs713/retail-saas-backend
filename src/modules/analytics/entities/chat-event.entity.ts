import { Shop } from '@/modules/shop/entities';

import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('chat_events')
export class ChatEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shop, (shop) => shop.chatEvents)
  shop: Shop;

  @Column({ type: 'uuid' })
  shopId: string;

  @Column('text')
  userQuery: string;

  @Column('int')
  answerLength: number;

  @Column('int')
  sourcesCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
