import { User } from '@/modules/user/entities';
import { ChatMessage } from './chat-message.entity';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chat_sessions')
@Index(['shopId', 'userId', 'status'])
@Index(['shopId', 'userId', 'lastMessageAt'])
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  shopId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { eager: false, nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: 'New chat' })
  title: string;

  @Column({ default: 'active' })
  status: 'active' | 'archived';

  @Column({ type: 'timestamptz' })
  lastMessageAt: Date;

  @OneToMany(() => ChatMessage, (message) => message.session, { eager: false })
  messages: ChatMessage[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
