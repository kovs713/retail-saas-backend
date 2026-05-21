import type { JsonValue } from './evotor-json.types';
import type { EvotorDocumentPayload } from './evotor-document.types';
import type { EvotorProductsWebhookPayload } from './evotor-product-webhook.types';
import type {
  EvotorHttpMethod,
  EvotorInboxEventType,
} from './evotor-webhook.types';

export interface EvotorInboxPayloadByEventType {
  'evotor.documents.received': EvotorDocumentPayload;
  'evotor.products.received': EvotorProductsWebhookPayload;
}

export type EvotorKnownInboxPayload =
  EvotorInboxPayloadByEventType[keyof EvotorInboxPayloadByEventType];

export type EvotorInboxPayload<
  TEventType extends EvotorInboxEventType = EvotorInboxEventType,
> = TEventType extends keyof EvotorInboxPayloadByEventType
  ? EvotorInboxPayloadByEventType[TEventType]
  : Record<string, JsonValue>;

export interface EvotorRedactedHeaders {
  authorization?: string;

  host?: string;
  accept?: string;
  'user-agent'?: string;
  'content-type'?: string;
  'content-length'?: string;

  'x-evotor-user-id'?: string;

  'x-forwarded-for'?: string;
  'x-forwarded-host'?: string;
  'x-forwarded-proto'?: string;

  'x-b3-traceid'?: string;
  'x-b3-spanid'?: string;
  'x-b3-parentspanid'?: string;
  'x-b3-sampled'?: string;

  via?: string;
  'accept-encoding'?: string;

  [key: string]: JsonValue | undefined;
}

export type { EvotorHttpMethod, EvotorInboxEventType };
