import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class EvotorAdminSyncDto {
  @ApiPropertyOptional({
    description:
      'Evotor user id. Required when bridge has multiple Evotor accounts.',
    example: '01-000000000000001',
  })
  @IsOptional()
  @IsString()
  evotorUserId?: string;

  @ApiPropertyOptional({
    description: 'Documents sync start date',
    example: '2026-05-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Documents sync end date',
    example: '2026-05-16',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class EvotorAdminCloudTokenDto {
  @ApiProperty({
    description: 'Evotor user id that owns the cloud token',
    example: '01-000000000000001',
  })
  @IsNotEmpty()
  @IsString()
  evotorUserId: string;

  @ApiProperty({
    description:
      'Evotor Cloud token. Forwarded to bridge and never stored in core.',
    example: 'evotor-cloud-token',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export type EvotorAdminDashboard = {
  accounts: unknown[];
  inboxEvents: unknown[];
  stores: unknown[];
  devices: unknown[];
  products: unknown[];
  documents: unknown[];
};
