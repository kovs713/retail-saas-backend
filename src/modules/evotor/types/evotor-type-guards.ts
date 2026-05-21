import type {
  EvotorDocumentPayload,
  EvotorSellDocumentPayload,
} from './evotor-document.types';
import type { EvotorProductRawPayload } from './evotor-raw-payload.types';
import type { EvotorProductsWebhookPayload } from './evotor-product-webhook.types';

// TODO: Add runtime schema validation for Evotor webhook payloads if payload processing becomes stricter.
// Current types are compile-time only because Evotor may send additional fields.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isEvotorSellDocumentPayload(
  payload: unknown,
): payload is EvotorSellDocumentPayload {
  if (!isRecord(payload)) return false;

  if (payload.type !== 'SELL') return false;
  if (typeof payload.id !== 'string') return false;
  if (!isRecord(payload.body)) return false;

  const body = payload.body;

  return (
    Array.isArray(body.positions) &&
    Array.isArray(body.payments) &&
    typeof body.result_sum === 'number'
  );
}

export function isEvotorDocumentPayload(
  payload: unknown,
): payload is EvotorDocumentPayload {
  if (!isRecord(payload)) return false;

  return (
    typeof payload.id === 'string' &&
    typeof payload.type === 'string' &&
    isRecord(payload.body)
  );
}

export function getEvotorDocumentType(payload: EvotorDocumentPayload): string {
  return payload.type;
}

export function isEvotorProductsWebhookPayload(
  payload: unknown,
): payload is EvotorProductsWebhookPayload {
  return (
    Array.isArray(payload) &&
    payload.every((item) => {
      return (
        isRecord(item) &&
        typeof item.uuid === 'string' &&
        typeof item.name === 'string' &&
        typeof item.group === 'boolean'
      );
    })
  );
}

export function isEvotorProductRawPayload(
  payload: unknown,
): payload is EvotorProductRawPayload {
  return (
    isRecord(payload) &&
    (typeof payload.uuid === 'string' || typeof payload.name === 'string')
  );
}
