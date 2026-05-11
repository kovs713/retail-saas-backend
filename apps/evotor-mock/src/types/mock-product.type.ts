export interface MockProduct {
  id: string;
  store_id: string;
  user_id: string;
  name: string;
  type: 'NORMAL';
  price: number;
  quantity: number;
  measure_name: 'шт';
  tax: 'VAT_20';
  allow_to_sell: true;
  article_number: string;
  created_at: string;
  updated_at: string;
}
