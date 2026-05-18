import { RegistrationStatus } from '@/common/enums';
import { Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('evotor_applications')
@Index(['userId', 'status'])
@Index(['shopId', 'status'])
@Index(['evotorUserId', 'status'])
export class EvotorApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { eager: false })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Column({ name: 'evotor_user_id', type: 'varchar', length: 255 })
  evotorUserId: string;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
