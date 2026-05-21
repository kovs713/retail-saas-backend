import type { EvotorInboxPayload } from './evotor-inbox-payload.types';

export interface EvotorOutboxPayload {
  eventId: string;
  source: 'evotor';
  eventType: string;
  evotorUserId: string | null;
  storeUuid: string | null;
  occurredAt: string;
  receivedAt: string;
  payload: EvotorInboxPayload;
  meta: {
    schemaVersion: 1;
    bridge: 'evotor-bridge';
    idempotencyKey: string;
    externalEventId?: string;
  };
}
