import { Shop } from '@/modules/shop/entities';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../dto';

@Entity('orders')
@Index(['shopId', 'externalSource', 'createdAt'])
@Index(['externalSource', 'externalId', 'externalStoreId'], {
  unique: true,
  where:
    '"externalSource" IS NOT NULL AND "externalId" IS NOT NULL AND "externalStoreId" IS NOT NULL',
})
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shop, (shop) => shop.orders)
  shop: Shop;

  @Column({ type: 'uuid' })
  shopId: string;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column('jsonb')
  items: { productId: string; quantity: number; price: number }[];

  @Column({ type: 'int', default: 0 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  externalSource: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalStoreId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
