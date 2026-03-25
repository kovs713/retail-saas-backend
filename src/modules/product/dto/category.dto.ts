import { Category } from '../entities';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class CategoryDto {
  @ApiProperty({ description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Category slug', example: 'electronics' })
  @Expose()
  slug: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @Expose()
  description: string | null;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  @Expose()
  parentId: string | null;

  @ApiProperty({ description: 'Shop ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  shopId: string;

  @ApiProperty({ description: 'Created at timestamp', example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  @Transform(({ value }) => (value as Date)?.toISOString())
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp', example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  @Transform(({ value }) => (value as Date)?.toISOString())
  updatedAt: Date;

  static fromEntity(entity: Category): CategoryDto {
    return plainToInstance(CategoryDto, entity, { excludeExtraneousValues: true });
  }

  static fromEntities(entities: Category[]): CategoryDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
