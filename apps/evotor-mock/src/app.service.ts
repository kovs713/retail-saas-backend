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

@Injectable()
export class AppService {
  private readonly stores = new Map<string, MockStore>();
  private readonly devices = new Map<string, MockDevice>();
  private readonly products = new Map<string, MockProduct>();

  getStatus() {
    return {
      status: 'ok',
      stores: this.stores.size,
      products: this.products.size,
      documents: 0,
      pendingWebhooks: 0,
      retailSaasUrl: process.env.RETAIL_SAAS_URL ?? 'http://backend:3000',
    };
  }

  seedStore(shopId: string, productCount = 0) {
    const storeId = `store-${shopId}`;
    const now = new Date().toISOString();
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

    for (let index = 1; index <= productCount; index += 1) {
      const product: MockProduct = {
        id: `product-${storeId}-${index}`,
        store_id: storeId,
        user_id: store.user_id,
        name: `Mock Product ${index}`,
        type: 'NORMAL',
        price: index * 100,
        quantity: index * 10,
        measure_name: 'шт',
        tax: 'VAT_20',
        allow_to_sell: true,
        article_number: `SKU-${storeId}-${index}`,
        created_at: now,
        updated_at: now,
      };

      this.products.set(this.getProductKey(storeId, product.id), product);
    }

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

  getProductsByStoreId(storeId: string) {
    return Array.from(this.products.values()).filter((product) => product.store_id === storeId);
  }

  getProductById(storeId: string, productId: string) {
    return this.products.get(this.getProductKey(storeId, productId)) ?? null;
  }

  private getProductKey(storeId: string, productId: string) {
    return `${storeId}:${productId}`;
  }
}
