export interface RemoteProduct {
  id: string;
  article_number: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  productId?: string;
  code?: string;
  rawPayload?: Record<string, unknown>;
  raw_payload?: Record<string, unknown>;
}
