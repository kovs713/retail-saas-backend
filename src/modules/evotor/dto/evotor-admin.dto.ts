import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class EvotorAdminListQueryDto {
  @ApiPropertyOptional({
    description: 'Evotor user id filter',
    example: '01-000000000000001',
  })
  @IsOptional()
  @IsString()
  evotorUserId?: string;

  @ApiPropertyOptional({
    description: 'Evotor store id filter',
    example: '20190607-4F3B-40E0-80F0-00155D012500',
  })
  @IsOptional()
  @IsString()
  storeId?: string;
}

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

export class EvotorAdminLinkStoreDto {
  @ApiProperty({
    description: 'Local shop id',
    example: '8c2e1d48-0d7e-43e6-91f2-17e7a2f0e9dd',
  })
  @IsNotEmpty()
  @IsString()
  shopId: string;

  @ApiProperty({
    description: 'Evotor user id that owns the store',
    example: '01-000000000000001',
  })
  @IsNotEmpty()
  @IsString()
  evotorUserId: string;

  @ApiProperty({
    description: 'Evotor store id',
    example: '20190607-4F3B-40E0-80F0-00155D012500',
  })
  @IsNotEmpty()
  @IsString()
  storeId: string;

  @ApiPropertyOptional({
    description: 'Optional Evotor device id inside the store',
    example: '20190607-4F3B-40E0-80F0-00155D012501',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Sync products immediately after linking',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  syncProducts?: boolean;
}

export type EvotorAdminDashboard = {
  accounts: unknown[];
  inboxEvents: unknown[];
  stores: unknown[];
  devices: unknown[];
  products: unknown[];
  documents: unknown[];
};
