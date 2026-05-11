import { Shop } from '../entities';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class ShopDto {
  @ApiProperty({
    description: 'Shop ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Shop name', example: 'My Shop' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Shop slug', example: 'my-shop' })
  @Expose()
  slug: string;

  @ApiPropertyOptional({ description: 'Shop description' })
  @Expose()
  description: string | null;

  @ApiPropertyOptional({ description: 'Shop address' })
  @Expose()
  address: string | null;

  @ApiPropertyOptional({ description: 'Shop phone' })
  @Expose()
  phone: string | null;

  @ApiPropertyOptional({ description: 'Working hours' })
  @Expose()
  workingHours: Record<string, string> | null;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @Expose()
  logoUrl: string | null;

  @ApiPropertyOptional({ description: 'Banner URL' })
  @Expose()
  bannerUrl: string | null;

  @ApiProperty({ description: 'Is shop active', example: true })
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Owner user ID' })
  @Expose()
  ownerId: string | null;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Updated at timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  })
  updatedAt?: string;

  static fromEntity(entity: Shop): ShopDto {
    return plainToInstance(ShopDto, entity, { excludeExtraneousValues: true });
  }

  static fromEntities(entities: Shop[]): ShopDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
