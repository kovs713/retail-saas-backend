import type { EvotorProductWebhookItem } from './evotor-product-webhook.types';

export interface EvotorStoreRawPayload {
  uuid?: string;
  name?: string | null;
  address?: string | null;
  timezone?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EvotorDeviceRawPayload {
  uuid?: string;
  storeUuid?: string | null;
  name?: string | null;
  serialNumber?: string | null;
  status?: string | null;
  model?: string | null;
  appVersion?: string | null;
  lastSeenAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type EvotorProductRawPayload =
  | EvotorProductWebhookItem
  | Record<string, unknown>;
