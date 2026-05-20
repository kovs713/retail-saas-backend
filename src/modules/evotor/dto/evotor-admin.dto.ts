import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { EvotorInboxEventType } from '../types';

const EVOTOR_USER_ID_PATTERN = /^[0-9a-f]{2}-[0-9a-f]{15}$/i;
const EVOTOR_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class EvotorAdminListQueryDto {
  @ApiPropertyOptional({
    description: 'Offset for pagination',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  take?: number = 20;

  @ApiPropertyOptional({
    description: 'Evotor user id filter',
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

  @ApiPropertyOptional({
    description: 'Filter inbox events by type',
    example: 'evotor.document.sell',
    enum: [
      'evotor.documents.received',
      'evotor.products.received',
      'evotor.document.sell',
      'evotor.document.z_report',
      'evotor.document.close_session',
      'evotor.document.open_session',
      'evotor.document.pos_open_session',
      'evotor.document.payback',
      'evotor.cloud_token.received',
      'evotor.user.verified',
      'evotor.user.created',
    ],
  })
  @IsOptional()
  @IsString()
  eventType?: EvotorInboxEventType;
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

export class EvotorAdminListResponse<T> {
  @ApiProperty({ description: 'List items' })
  items: T[];

  @ApiProperty({ description: 'Total items matching filter', example: 42 })
  total: number;

  @ApiProperty({ description: 'Offset used', example: 0 })
  skip: number;

  @ApiProperty({ description: 'Limit used', example: 20 })
  take: number;
}

export class EvotorAccountDto {
  @ApiProperty({ description: 'Evotor user ID', example: '01-000000000000001' })
  id: string;

  @ApiPropertyOptional({ description: 'Account name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Account email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Account status' })
  status?: string;

  @ApiPropertyOptional({ description: 'When the account was created' })
  createdAt?: string;

  @ApiPropertyOptional({ description: 'When the account was last updated' })
  updatedAt?: string;

  [key: string]: unknown;
}

export class EvotorStoreDto {
  @ApiProperty({
    description: 'Evotor store UUID',
    example: '20190607-4F3B-40E0-80F0-00155D012500',
  })
  id: string;

  @ApiPropertyOptional({ description: 'Store name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Store address' })
  address?: string;

  @ApiPropertyOptional({ description: 'Store status' })
  status?: string;

  @ApiPropertyOptional({ description: 'Evotor user ID that owns this store' })
  evotorUserId?: string;

  @ApiPropertyOptional({ description: 'Store timezone' })
  timezone?: string;

  @ApiPropertyOptional({ description: 'When the store was created' })
  createdAt?: string;

  @ApiPropertyOptional({ description: 'When the store was last updated' })
  updatedAt?: string;

  [key: string]: unknown;
}

export class EvotorDeviceDto {
  @ApiProperty({
    description: 'Evotor device UUID',
    example: '20190607-4F3B-40E0-80F0-00155D012501',
  })
  id: string;

  @ApiPropertyOptional({ description: 'Device/terminal name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Device serial number' })
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Device model' })
  model?: string;

  @ApiPropertyOptional({ description: 'Device status' })
  status?: string;

  @ApiPropertyOptional({ description: 'Store UUID this device belongs to' })
  storeId?: string;

  @ApiPropertyOptional({ description: 'Evotor user ID' })
  evotorUserId?: string;

  @ApiPropertyOptional({ description: 'App version on device' })
  appVersion?: string;

  @ApiPropertyOptional({ description: 'When the device was last seen' })
  lastSeenAt?: string;

  @ApiPropertyOptional({ description: 'When the device was created' })
  createdAt?: string;

  @ApiPropertyOptional({ description: 'When the device was last updated' })
  updatedAt?: string;

  [key: string]: unknown;
}

export class EvotorProductDto {
  @ApiProperty({ description: 'Evotor product UUID' })
  id: string;

  @ApiPropertyOptional({ description: 'Product article number (SKU)' })
  articleNumber?: string;

  @ApiPropertyOptional({ description: 'Product name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Product price in kopecks' })
  price?: number;

  @ApiPropertyOptional({ description: 'Available quantity' })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Store UUID this product belongs to' })
  storeId?: string;

  @ApiPropertyOptional({ description: 'Evotor user ID' })
  evotorUserId?: string;

  @ApiPropertyOptional({ description: 'Evotor account relation' })
  evotorAccount?: Record<string, unknown>;

  [key: string]: unknown;
}

export type EvotorAdminDashboard = {
  accounts: EvotorAccountDto[];
  inboxEvents: EvotorInboxEventDto[];
  stores: EvotorStoreDto[];
  devices: EvotorDeviceDto[];
  products: EvotorProductDto[];
  documents: unknown[];
};

export class EvotorInboxEventDto {
  @ApiProperty({ description: 'Unique event identifier' })
  eventId: string;

  @ApiProperty({ description: 'Event source', example: 'evotor' })
  source: string;

  @ApiProperty({
    description: 'Event type',
    example: 'evotor.documents.received',
  })
  eventType: string;

  @ApiPropertyOptional({ description: 'Evotor user ID' })
  evotorUserId: string | null;

  @ApiPropertyOptional({ description: 'Evotor store UUID' })
  storeUuid: string | null;

  @ApiProperty({ description: 'When the event occurred in Evotor' })
  occurredAt: string;

  @ApiProperty({ description: 'When the bridge received the event' })
  receivedAt: string;

  @ApiProperty({ description: 'Event payload (varies by eventType)' })
  payload: Record<string, unknown>;

  @ApiProperty({ description: 'Event metadata' })
  meta: {
    schemaVersion: 1;
    bridge: 'evotor-bridge';
    idempotencyKey: string;
    externalEventId?: string;
  };
}
