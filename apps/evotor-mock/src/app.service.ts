import { Injectable } from '@nestjs/common';

export interface MockStore {
  id: string;
  name: string;
  address: string;
  user_id: string;
}

export interface MockDevice {
  id: string;
  store_id: string;
  name: string;
  timezone_offset: number;
}

@Injectable()
export class AppService {
  private readonly stores = new Map<string, MockStore>();
  private readonly devices = new Map<string, MockDevice>();

  getStatus() {
    return {
      status: 'ok',
      stores: this.stores.size,
      products: 0,
      documents: 0,
      pendingWebhooks: 0,
      retailSaasUrl: process.env.RETAIL_SAAS_URL ?? 'http://backend:3000',
    };
  }

  seedStore(shopId: string) {
    const storeId = `store-${shopId}`;
    const store: MockStore = {
      id: storeId,
      name: `Mock Store ${shopId}`,
      address: `Mock address for ${shopId}`,
      user_id: `user-${shopId}`,
    };
    const device: MockDevice = {
      id: `device-${storeId}`,
      store_id: storeId,
      name: `Mock Device ${storeId}`,
      timezone_offset: 10800000,
    };

    this.stores.set(store.id, store);
    this.devices.set(device.id, device);

    return {
      store,
      device,
    };
  }

  getStores() {
    return Array.from(this.stores.values());
  }

  getDevices() {
    return Array.from(this.devices.values());
  }

  getDevicesByStoreId(storeId: string) {
    return this.getDevices().filter((device) => device.store_id === storeId);
  }
}
