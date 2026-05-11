import {
  MockDevice,
  MockDocument,
  MockProduct,
  MockSellPosition,
  MockStore,
  UpsertMockProductInput,
} from './types';

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly stores = new Map<string, MockStore>();
  private readonly devices = new Map<string, MockDevice>();
  private readonly products = new Map<string, MockProduct>();
  private readonly documents = new Map<string, MockDocument>();

  getStatus() {
    return {
      status: 'ok',
      stores: this.stores.size,
      products: this.products.size,
      documents: this.documents.size,
      pendingWebhooks: 0,
      retailSaasUrl: process.env.RETAIL_SAAS_URL ?? 'http://backend:3000',
    };
  }

  seedStore(
    shopId: string,
    productCount = 0,
    documentCount = 0,
    catalogPreset:
      | 'default'
      | 'electronics'
      | 'fashion'
      | 'grocery' = 'default',
  ) {
    const store = this.upsertStore(shopId, null);
    const device = this.ensureDefaultDevice(store);
    const now = Date.now();

    for (let index = 1; index <= productCount; index += 1) {
      const product = this.buildSeedProduct(store, index, now, catalogPreset);
      this.products.set(this.getProductKey(store.id, product.id), product);
    }

    const seededProducts = this.getProductsByStoreId(store.id);

    for (let index = 1; index <= documentCount; index += 1) {
      const product = seededProducts[(index - 1) % seededProducts.length];

      if (!product) {
        break;
      }

      const position: MockSellPosition = {
        uuid: `position-${store.id}-${index}`,
        id: 1,
        product_id: product.id,
        product_name: product.name,
        product_type: 'NORMAL',
        price: product.price,
        result_price: product.price,
        quantity: 1,
        sum: product.price,
        result_sum: product.price,
        measure_name: 'шт',
        tax: 'VAT_20',
        initial_quantity: product.quantity,
      };
      const document: MockDocument = {
        id: `document-${store.id}-${index}`,
        type: 'SELL',
        number: index,
        close_date: new Date(now + productCount + index).toISOString(),
        time_zone_offset: 10800000,
        session_id: `session-${store.id}`,
        session_number: 1,
        close_user_id: store.user_id,
        device_id: device.id,
        store_id: store.id,
        user_id: store.user_id,
        version: 'V2',
        body: {
          positions: [position],
          payments: [
            {
              id: `payment-${store.id}-${index}`,
              type: 'ELECTRON',
              sum: product.price,
            },
          ],
          result_sum: product.price,
        },
      };

      this.documents.set(this.getDocumentKey(store.id, document.id), document);
    }

    return {
      store,
      device,
    };
  }

  bindTerminals(shopId: string, phone: string, imeis: string[]) {
    const normalizedImeis = [
      ...new Set(imeis.map((imei) => imei.trim())),
    ].filter(Boolean);
    const store = this.upsertStore(shopId, phone);
    const existingDevices = this.getDevicesByStoreId(store.id);

    for (const device of existingDevices) {
      if (!normalizedImeis.includes(device.imei)) {
        this.devices.delete(device.id);
      }
    }

    for (const [index, imei] of normalizedImeis.entries()) {
      const device: MockDevice = {
        id: this.buildDeviceId(store.id, imei),
        store_id: store.id,
        name: `Mock Device ${index + 1} ${store.id}`,
        timezone_offset: 10800000,
        phone,
        imei,
      };

      this.devices.set(device.id, device);
    }

    let seededProductsCount = 0;
    if (this.getProductsByStoreId(store.id).length === 0) {
      this.seedStore(shopId, 12);
      seededProductsCount = 12;
    }

    return {
      store,
      devices: this.getDevicesByStoreId(store.id),
      userId: store.user_id,
      storeId: store.id,
      seededProductsCount,
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

  getProductsByStoreId(storeId: string, id?: string, since?: string) {
    let products = Array.from(this.products.values()).filter(
      (product) => product.store_id === storeId,
    );

    if (id) {
      const ids = new Set(id.split(','));
      products = products.filter((product) => ids.has(product.id));
    }

    if (since) {
      const sinceTimestamp = Number(since);
      if (!Number.isNaN(sinceTimestamp)) {
        products = products.filter(
          (product) => new Date(product.updated_at).getTime() > sinceTimestamp,
        );
      }
    }

    return products;
  }

  getProductById(storeId: string, productId: string) {
    return this.products.get(this.getProductKey(storeId, productId)) ?? null;
  }

  upsertProducts(storeId: string, items: UpsertMockProductInput[]) {
    const store = this.stores.get(storeId);

    if (!store) {
      return [];
    }

    const updatedProducts = items.map((item) => {
      const key = this.getProductKey(storeId, item.id);
      const existing = this.products.get(key);
      const timestamp = new Date().toISOString();

      const product: MockProduct = {
        id: item.id,
        store_id: storeId,
        user_id: store.user_id,
        name: item.name,
        type: 'NORMAL',
        price: item.price,
        quantity: item.quantity,
        measure_name: existing?.measure_name ?? 'шт',
        tax: existing?.tax ?? 'VAT_20',
        allow_to_sell: true,
        article_number: item.article_number,
        created_at: existing?.created_at ?? timestamp,
        updated_at: timestamp,
      };

      this.products.set(key, product);
      return product;
    });

    return updatedProducts;
  }

  getDocumentsByStoreId(storeId: string) {
    return Array.from(this.documents.values()).filter(
      (document) => document.store_id === storeId,
    );
  }

  getDocumentById(storeId: string, documentId: string) {
    return this.documents.get(this.getDocumentKey(storeId, documentId)) ?? null;
  }

  getDocumentsByDeviceId(storeId: string, deviceId: string) {
    return this.getDocumentsByStoreId(storeId).filter(
      (document) => document.device_id === deviceId,
    );
  }

  reset() {
    this.stores.clear();
    this.devices.clear();
    this.products.clear();
    this.documents.clear();

    return { status: 'ok' };
  }

  private getProductKey(storeId: string, productId: string) {
    return `${storeId}:${productId}`;
  }

  private getDocumentKey(storeId: string, documentId: string) {
    return `${storeId}:${documentId}`;
  }

  private upsertStore(shopId: string, phone: string | null): MockStore {
    const storeId = `store-${shopId}`;
    const existing = this.stores.get(storeId);
    const store: MockStore = {
      id: storeId,
      name: existing?.name ?? `Mock Store ${shopId}`,
      address: existing?.address ?? `Mock address for ${shopId}`,
      user_id: existing?.user_id ?? `user-${shopId}`,
      phone: phone ?? existing?.phone ?? null,
      retail_saas_shop_id: existing?.retail_saas_shop_id ?? shopId,
    };

    this.stores.set(store.id, store);
    return store;
  }

  private ensureDefaultDevice(store: MockStore): MockDevice {
    const existingDevice = this.getDevicesByStoreId(store.id)[0];
    if (existingDevice) {
      return existingDevice;
    }

    const device: MockDevice = {
      id: this.buildDeviceId(store.id, 'demo-terminal-1'),
      store_id: store.id,
      name: `Mock Device ${store.id}`,
      timezone_offset: 10800000,
      phone: store.phone,
      imei: 'demo-terminal-1',
    };

    this.devices.set(device.id, device);
    return device;
  }

  private buildDeviceId(storeId: string, imei: string): string {
    return `device-${storeId}-${imei}`;
  }

  private buildSeedProduct(
    store: MockStore,
    index: number,
    now: number,
    catalogPreset: 'default' | 'electronics' | 'fashion' | 'grocery',
  ): MockProduct {
    const timestamp = new Date(now + index).toISOString();
    const preset = {
      default: {
        name: `Mock Product ${index}`,
        price: index * 100,
        quantity: index * 10,
      },
      electronics: {
        name: `Electronics Item ${index}`,
        price: index * 1250,
        quantity: index * 3,
      },
      fashion: {
        name: `Fashion Item ${index}`,
        price: index * 850,
        quantity: index * 5,
      },
      grocery: {
        name: `Grocery Item ${index}`,
        price: index * 120,
        quantity: index * 20,
      },
    }[catalogPreset];

    return {
      id: `product-${store.id}-${index}`,
      store_id: store.id,
      user_id: store.user_id,
      name: preset.name,
      type: 'NORMAL',
      price: preset.price,
      quantity: preset.quantity,
      measure_name: 'шт',
      tax: 'VAT_20',
      allow_to_sell: true,
      article_number: `SKU-${store.id}-${index}`,
      created_at: timestamp,
      updated_at: timestamp,
    };
  }
}
