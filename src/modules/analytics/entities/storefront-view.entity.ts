import { Shop } from '@/modules/shop/entities';

import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('storefront_views')
export class StorefrontView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shop, (shop) => shop.storefrontViews)
  shop: Shop;

  @Column({ type: 'uuid' })
  shopId: string;

  @CreateDateColumn()
  createdAt: Date;
}
