export interface MockDevice {
  id: string;
  store_id: string;
  name: string;
  timezone_offset: number;
  phone: string | null;
  imei: string;
}
