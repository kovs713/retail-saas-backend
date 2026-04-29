export interface MockSellPosition {
  uuid: string;
  id: number;
  product_id: string;
  product_name: string;
  product_type: 'NORMAL';
  price: number;
  result_price: number;
  quantity: number;
  sum: number;
  result_sum: number;
  measure_name: 'шт';
  tax: 'VAT_20';
  initial_quantity: number;
}
