import { Shop } from './';

import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: ['PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'], default: 'PENDING' })
  status: 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
