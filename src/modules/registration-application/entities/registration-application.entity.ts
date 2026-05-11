import { RegistrationStatus } from '@/common/enums';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('registration_applications')
@Index(['email'], { unique: true })
@Index(['shopSlug'], { unique: true })
@Index(['status'])
export class RegistrationApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  shopName: string;

  @Column({ unique: true })
  shopSlug: string;

  @Column({ type: 'text', nullable: true })
  shopDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  shopAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  shopPhone: string | null;

  @Column({ type: 'jsonb', nullable: true })
  shopWorkingHours: Record<string, string> | null;

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

  @Column({ type: 'uuid', nullable: true })
  approvedShopId: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedUserId: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
