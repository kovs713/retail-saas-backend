import { Location } from '../entities';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, plainToInstance } from 'class-transformer';

export class LocationDto {
  @ApiProperty({ description: 'Location ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Shop ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  shopId: string;

  @ApiProperty({ description: 'Location name', example: 'Main Branch' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Location address' })
  @Expose()
  address: string | null;

  @ApiPropertyOptional({ description: 'Location phone' })
  @Expose()
  phone: string | null;

  @ApiPropertyOptional({ description: 'Working hours' })
  @Expose()
  workingHours: Record<string, string> | null;

  @ApiProperty({ description: 'Is default location', example: false })
  @Expose()
  isDefault: boolean;

  @ApiProperty({ description: 'Is active', example: true })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Created at timestamp', example: '2024-01-01T00:00:00.000Z' })
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

  @ApiProperty({ description: 'Updated at timestamp', example: '2024-01-01T00:00:00.000Z' })
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
  updatedAt: string;

  static fromEntity(entity: Location): LocationDto {
    return plainToInstance(LocationDto, entity, { excludeExtraneousValues: true });
  }

  static fromEntities(entities: Location[]): LocationDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
