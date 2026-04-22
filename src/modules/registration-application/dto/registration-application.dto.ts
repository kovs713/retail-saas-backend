import { RegistrationApplication } from '../entities/registration-application.entity';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';

export class RegistrationApplicationDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  shopName: string;

  @ApiProperty()
  @Expose()
  shopSlug: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiPropertyOptional()
  @Expose()
  rejectionReason: string | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  static fromEntity(entity: RegistrationApplication): RegistrationApplicationDto {
    return plainToInstance(RegistrationApplicationDto, entity, { excludeExtraneousValues: true });
  }

  static fromEntities(entities: RegistrationApplication[]): RegistrationApplicationDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
