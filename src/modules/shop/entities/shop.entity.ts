import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { User } from '@/modules/user/entities';
import { Order } from './order.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('shops')
@Index(['slug'])
@Index(['ownerId'])
@Index(['isActive'])
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true, nullable: true })
  ownerId: string | null;

  @OneToOne(() => User, { eager: false })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => ChatEvent, (chatEvent) => chatEvent.shop)
  chatEvents: ChatEvent[];

  @OneToMany(() => StorefrontView, (storefrontView) => storefrontView.shop)
  storefrontViews: StorefrontView[];

  @OneToMany(() => Order, (order) => order.shop)
  orders: Order[];

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'jsonb', nullable: true })
  workingHours: Record<string, string> | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  bannerUrl: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
