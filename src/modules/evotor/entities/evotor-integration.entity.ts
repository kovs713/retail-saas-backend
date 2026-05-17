import { Shop } from '@/modules/shop/entities';

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

@Entity('evotor_integrations')
@Index(['shopId'], { unique: true })
@Index(['provider', 'externalStoreId'], {
  unique: true,
  where: "status = 'connected'",
})
@Index(['status'])
export class EvotorIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { eager: false })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Column({ type: 'varchar', length: 50, default: 'evotor' })
  provider: string;

  @Column({ type: 'varchar', length: 50, default: 'connected' })
  status: string;

  @Column({ type: 'varchar', length: 255 })
  externalStoreId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalDeviceId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalUserId: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastSyncAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
