export type EvotorUuid = string;
export type EvotorDateTimeString = string;
export type EvotorReceiptDateString = string;
export type EvotorReceiptTimeString = string;

export enum EvotorInboxEventStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

export type EvotorInboxEventType =
  | 'evotor.documents.received'
  | 'evotor.products.received'
  | 'evotor.store.changed'
  | 'evotor.device.changed'
  | 'evotor.employee.changed'
  | 'evotor.subscription.event'
  | 'evotor.installation.event'
  | (string & {});

export type EvotorHttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | (string & {});

export type EvotorDocumentType =
  | 'SELL'
  | 'PAYBACK'
  | 'BUY'
  | 'BUYBACK'
  | 'OPEN_SESSION'
  | 'CLOSE_SESSION'
  | 'ACCEPT'
  | 'INVENTORY'
  | 'WRITE_OFF'
  | 'REVALUATION'
  | 'CORRECTION'
  | (string & {});

export type EvotorDocumentVersion = 'V1' | 'V2' | (string & {});

export type EvotorProductType =
  | 'NORMAL'
  | 'ALCOHOL_MARKED'
  | 'ALCOHOL_NOT_MARKED'
  | 'BEER_MARKED_KEG'
  | 'SERVICE'
  | 'TOBACCO_MARKED'
  | 'MEDICINE_MARKED'
  | (string & {});

export type EvotorTaxType =
  | 'NO_VAT'
  | 'VAT_0'
  | 'VAT_10'
  | 'VAT_18'
  | 'VAT_20'
  | 'VAT_110'
  | 'VAT_118'
  | 'VAT_120'
  | (string & {});

export type EvotorPaymentType =
  | 'CASH'
  | 'ELECTRON'
  | 'PREPAID'
  | 'CREDIT'
  | 'OTHER'
  | (string & {});

export type EvotorPrintGroupType = 'CASH_RECEIPT' | (string & {});

export type EvotorSettlementMethodType =
  | 'CHECKOUT_FULL'
  | 'CHECKOUT_PARTIAL'
  | 'PREPAYMENT_FULL'
  | 'PREPAYMENT_PARTIAL'
  | 'CREDIT_CHECKOUT'
  | 'CREDIT_PAYMENT'
  | (string & {});
