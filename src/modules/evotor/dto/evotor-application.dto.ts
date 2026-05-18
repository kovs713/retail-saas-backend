import { RegistrationStatus } from '@/common/enums';
import { EvotorApplication } from '../entities';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEvotorApplicationDto {
  @ApiProperty({
    description: 'Evotor user id to bind after admin approval',
    example: '01-000000000000001',
  })
  @IsNotEmpty()
  @IsString()
  evotor_user_id: string;
}

export class RejectEvotorApplicationDto {
  @ApiPropertyOptional({
    description: 'Rejection reason',
    example: 'Evotor account is not found',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EvotorApplicationDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  userId: string;

  @ApiProperty()
  @Expose()
  shopId: string;

  @ApiProperty()
  @Expose()
  evotorUserId: string;

  @ApiProperty({ example: RegistrationStatus.PENDING })
  @Expose()
  status: RegistrationStatus;

  @ApiPropertyOptional()
  @Expose()
  rejectionReason: string | null;

  @ApiPropertyOptional()
  @Expose()
  reviewedAt: Date | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  static fromEntity(entity: EvotorApplication): EvotorApplicationDto {
    return plainToInstance(EvotorApplicationDto, entity, {
      excludeExtraneousValues: true,
    });
  }

  static fromEntities(entities: EvotorApplication[]): EvotorApplicationDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
