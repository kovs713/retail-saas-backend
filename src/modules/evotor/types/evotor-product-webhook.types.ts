import type {
  EvotorProductType,
  EvotorTaxType,
  EvotorUuid,
} from './evotor-webhook.types';

export type EvotorProductsWebhookPayload = EvotorProductWebhookItem[];

export interface EvotorProductWebhookItem {
  uuid: EvotorUuid;

  name: string;
  group: boolean;

  code?: string | null;
  barCodes?: string[];
  alcoCodes?: string[];

  price?: number | null;
  quantity?: number | null;
  costPrice?: number | null;

  measureName?: string | null;
  tax?: EvotorTaxType | null;

  allowToSell?: boolean | null;
  description?: string | null;
  articleNumber?: string | null;

  parentUuid?: EvotorUuid | null;

  hasVariants?: boolean | null;

  type?: EvotorProductType;

  alcoholByVolume?: number | null;
  alcoholProductKindCode?: number | null;
  tareVolume?: number | null;
}
