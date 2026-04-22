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

export interface UpsertMockProductInput {
  id: string;
  name: string;
  price: number;
  quantity: number;
  article_number: string;
}

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

export interface MockPayment {
  id: string;
  type: 'ELECTRON';
  sum: number;
}

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

  seedStore(shopId: string, productCount = 0, documentCount = 0) {
    const storeId = `store-${shopId}`;
    const now = Date.now();
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
      const timestamp = new Date(now + index).toISOString();
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
        created_at: timestamp,
        updated_at: timestamp,
      };

      this.products.set(this.getProductKey(storeId, product.id), product);
    }

    const seededProducts = this.getProductsByStoreId(storeId);

    for (let index = 1; index <= documentCount; index += 1) {
      const product = seededProducts[(index - 1) % seededProducts.length];

      if (!product) {
        break;
      }

      const position: MockSellPosition = {
        uuid: `position-${storeId}-${index}`,
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
        id: `document-${storeId}-${index}`,
        type: 'SELL',
        number: index,
        close_date: new Date(now + productCount + index).toISOString(),
        time_zone_offset: 10800000,
        session_id: `session-${storeId}`,
        session_number: 1,
        close_user_id: store.user_id,
        device_id: device.id,
        store_id: storeId,
        user_id: store.user_id,
        version: 'V2',
        body: {
          positions: [position],
          payments: [
            {
              id: `payment-${storeId}-${index}`,
              type: 'ELECTRON',
              sum: product.price,
            },
          ],
          result_sum: product.price,
        },
      };

      this.documents.set(this.getDocumentKey(storeId, document.id), document);
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
}
