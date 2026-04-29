import { BoundDevice } from './bound-device.type';

export interface TerminalBindingResult {
  storeId: string;
  userId: string;
  seededProductsCount: number;
  devices: BoundDevice[];
}
