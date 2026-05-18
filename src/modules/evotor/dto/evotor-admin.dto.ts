import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const EVOTOR_USER_ID_PATTERN = /^[0-9a-f]{2}-[0-9a-f]{15}$/i;
const EVOTOR_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class EvotorAdminListQueryDto {
  @ApiPropertyOptional({
    description: 'Evotor user id filter. If omitted, returns all accounts.',
    example: '01-000000000000001',
  })
  @IsOptional()
  @IsString()
  @Matches(EVOTOR_USER_ID_PATTERN, { message: 'Invalid evotorUserId format' })
  evotorUserId?: string;

  @ApiPropertyOptional({
    description: 'Evotor store id filter',
    example: '20190607-4F3B-40E0-80F0-00155D012500',
  })
  @IsOptional()
  @IsString()
  @Matches(EVOTOR_UUID_PATTERN, { message: 'Invalid storeId format' })
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Pagination cursor for next page',
    example: 'eyJpZCI6InByb2QtMTUwIn0=',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Documents filter start date',
    example: '2026-05-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Documents filter end date',
    example: '2026-05-16',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class EvotorAdminSyncDto {
  @ApiProperty({
    description:
      'Evotor user id. Required when bridge has multiple Evotor accounts.',
    example: '01-000000000000001',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(EVOTOR_USER_ID_PATTERN, { message: 'Invalid evotorUserId format' })
  evotorUserId: string;

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

export class EvotorAdminStoreSyncDto {
  @ApiProperty({
    description: 'Evotor user id that owns the store',
    example: '01-000000000000001',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(EVOTOR_USER_ID_PATTERN, { message: 'Invalid evotorUserId format' })
  evotorUserId: string;

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
  @Matches(EVOTOR_USER_ID_PATTERN, { message: 'Invalid evotorUserId format' })
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
  @Matches(EVOTOR_USER_ID_PATTERN, { message: 'Invalid evotorUserId format' })
  evotorUserId: string;

  @ApiProperty({
    description: 'Evotor store id',
    example: '20190607-4F3B-40E0-80F0-00155D012500',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(EVOTOR_UUID_PATTERN, { message: 'Invalid storeId format' })
  storeId: string;

  @ApiPropertyOptional({
    description: 'Optional Evotor device id inside the store',
    example: '20190607-4F3B-40E0-80F0-00155D012501',
  })
  @IsOptional()
  @IsString()
  @Matches(EVOTOR_UUID_PATTERN, { message: 'Invalid deviceId format' })
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
