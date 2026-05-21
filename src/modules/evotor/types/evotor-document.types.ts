import type { JsonObject, JsonValue } from './evotor-json.types';
import type {
  EvotorDateTimeString,
  EvotorDocumentType,
  EvotorDocumentVersion,
  EvotorPaymentType,
  EvotorPrintGroupType,
  EvotorProductType,
  EvotorReceiptDateString,
  EvotorReceiptTimeString,
  EvotorSettlementMethodType,
  EvotorTaxType,
  EvotorUuid,
} from './evotor-webhook.types';

export interface EvotorBaseDocumentPayload<
  TType extends string = EvotorDocumentType,
  TBody = JsonObject,
> {
  id: EvotorUuid;
  type: TType;
  extras: JsonObject;
  number: number;

  user_id: string;
  version: EvotorDocumentVersion;

  store_id: EvotorUuid;
  device_id: EvotorUuid;

  close_date?: EvotorDateTimeString | null;
  created_at?: EvotorDateTimeString | null;

  session_id?: EvotorUuid | null;
  session_number?: number | null;

  close_user_id?: EvotorUuid | null;
  counterparties?: JsonValue[] | JsonObject | null;

  time_zone_offset?: number | null;

  body: TBody;
}

export type EvotorPaybackDocumentPayload = EvotorBaseDocumentPayload<
  'PAYBACK',
  JsonObject
>;

export type EvotorBuyDocumentPayload = EvotorBaseDocumentPayload<
  'BUY',
  JsonObject
>;

export type EvotorBuybackDocumentPayload = EvotorBaseDocumentPayload<
  'BUYBACK',
  JsonObject
>;

export type EvotorOpenSessionDocumentPayload = EvotorBaseDocumentPayload<
  'OPEN_SESSION',
  JsonObject
>;

export type EvotorCloseSessionDocumentPayload = EvotorBaseDocumentPayload<
  'CLOSE_SESSION',
  JsonObject
>;

export type EvotorAcceptDocumentPayload = EvotorBaseDocumentPayload<
  'ACCEPT',
  JsonObject
>;

export type EvotorInventoryDocumentPayload = EvotorBaseDocumentPayload<
  'INVENTORY',
  JsonObject
>;

export type EvotorWriteOffDocumentPayload = EvotorBaseDocumentPayload<
  'WRITE_OFF',
  JsonObject
>;

export type EvotorRevaluationDocumentPayload = EvotorBaseDocumentPayload<
  'REVALUATION',
  JsonObject
>;

export type EvotorCorrectionDocumentPayload = EvotorBaseDocumentPayload<
  'CORRECTION',
  JsonObject
>;

export type EvotorDocumentPayload =
  | EvotorSellDocumentPayload
  | EvotorPaybackDocumentPayload
  | EvotorBuyDocumentPayload
  | EvotorBuybackDocumentPayload
  | EvotorOpenSessionDocumentPayload
  | EvotorCloseSessionDocumentPayload
  | EvotorAcceptDocumentPayload
  | EvotorInventoryDocumentPayload
  | EvotorWriteOffDocumentPayload
  | EvotorRevaluationDocumentPayload
  | EvotorCorrectionDocumentPayload
  | EvotorBaseDocumentPayload<string, JsonObject>;

export type EvotorSellDocumentPayload = EvotorBaseDocumentPayload<
  'SELL',
  EvotorSellDocumentBody
>;

export interface EvotorSellDocumentBody {
  positions: EvotorSellPosition[];
  payments: EvotorPayment[];

  sum?: number;
  result_sum: number;

  print_groups?: EvotorPrintGroup[];
  doc_discounts?: EvotorDiscount[];
  pos_print_results?: EvotorPosPrintResult[];

  customer_email?: string | null;
  customer_phone?: string | number | null;
}

export interface EvotorSellPosition {
  id: number;

  uuid?: EvotorUuid | null;
  product_id?: string | null;

  code?: string | null;
  bar_code?: string | null;

  product_name?: string | null;
  product_type: EvotorProductType;
  measure_name?: string | null;

  quantity: number;
  initial_quantity?: number | null;
  quantity_in_package?: number | null;

  price: number;
  cost_price?: number | null;
  result_price: number;

  sum: number;
  result_sum: number;

  tax: EvotorPositionTax;

  mark?: string | null;
  mark_data?: JsonValue | null;

  extra_keys?: JsonValue[];
  sub_positions?: JsonValue[];

  is_age_limited?: boolean;
  print_group_id?: string | null;

  agent_requisites?: JsonObject | null;

  alcohol_by_volume?: number | null;
  alcohol_product_kind_code?: number | null;
  tare_volume?: number | null;
  measure_precision?: number | null;

  position_discount?: EvotorPositionDiscount | null;
  doc_distributed_discount?: EvotorDiscount | null;

  settlement_method?: EvotorSettlementMethod | null;
  attributes_choices?: JsonValue[] | null;
  splitted_positions?: JsonValue[] | null;
}

export interface EvotorPositionTax {
  type: EvotorTaxType;
  sum: number;
  result_sum: number;
}

export interface EvotorSettlementMethod {
  type: EvotorSettlementMethodType;
  amount?: number | null;
}

export interface EvotorDiscount {
  discount_type?: string;
  discount_sum?: number;
  discount_percent?: number;
  coupon?: string | null;
}

export interface EvotorPositionDiscount extends EvotorDiscount {
  discount_price?: number | null;
}

export interface EvotorPayment {
  id: string;
  type: EvotorPaymentType;
  sum: number;

  parts?: EvotorPaymentPart[];

  app_info?: EvotorPaymentAppInfo | null;
  app_payment?: EvotorPaymentAppInfo | null;

  bank_info?: EvotorBankInfo | null;
  merchant_info?: EvotorMerchantInfo | null;

  parent_id?: string | null;
  driver_info?: JsonObject | null;
  cashless_info?: JsonObject | null;

  rrn?: string | null;
}

export interface EvotorPaymentPart {
  print_group_id: string;
  part_sum: number;
  change: number;
}

export interface EvotorPaymentAppInfo {
  app_id?: string | null;
  name?: string | null;
}

export interface EvotorBankInfo {
  name?: string | null;
}

export interface EvotorMerchantInfo {
  number?: string | null;
  english_name?: string | null;
  category_code?: string | null;
}

export interface EvotorPrintGroup {
  id: string;
  type: EvotorPrintGroupType;

  org_inn?: string | null;
  org_name?: string | null;
  org_address?: string | null;
  taxation_system?: string | null;

  medicine_attributes?: JsonObject | null;
}

export interface EvotorPosPrintResult {
  print_group_id: string;

  receipt_number: number;
  session_number: number;
  document_number: number;

  check_sum: number;

  receipt_date: EvotorReceiptDateString;
  receipt_time?: EvotorReceiptTimeString;

  fn_reg_number?: string | null;
  fn_serial_number?: string | null;

  kkt_reg_number?: string | null;
  kkt_serial_number?: string | null;

  fiscal_document_number?: number | null;
  fiscal_sign_doc_number?: string | null;
}
