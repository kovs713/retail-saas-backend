import { MockPayment } from './mock-payment.type';
import { MockSellPosition } from './mock-sell-position.type';

export interface MockDocument {
  id: string;
  type: 'SELL';
  number: number;
  close_date: string;
  time_zone_offset: number;
  session_id: string;
  session_number: number;
  close_user_id: string;
  device_id: string;
  store_id: string;
  user_id: string;
  version: 'V2';
  body: {
    positions: MockSellPosition[];
    payments: MockPayment[];
    result_sum: number;
  };
}
