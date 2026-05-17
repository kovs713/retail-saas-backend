import { Shop } from '@/modules/shop/entities';
import { Category } from './';
import { ProductImage } from './product-image.entity';

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

@Entity('products')
@Index(['shopId', 'sku'], { unique: true })
@Index(['shopId', 'deletedAt'])
@Index(['shopId', 'categoryId'])
@Index(['shopId', 'externalSource'])
@Index(['shopId', 'externalId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  shopId: string;

  @ManyToOne(() => Shop, { eager: false })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Column()
  @Index()
  sku: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ type: 'int', nullable: true })
  cost: number | null;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  categoryId: string | null;

  @ManyToOne(() => Category, { eager: false, nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  barcode: string | null;

  @OneToMany(() => ProductImage, (image) => image.product, {
    onDelete: 'CASCADE',
  })
  images: ProductImage[];

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  externalSource: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalStoreId: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;
}
