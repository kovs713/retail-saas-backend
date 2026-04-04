import { Shop } from '@/modules/shop/entities';

import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrderStatus } from '../dto';

@Entity('orders')
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
