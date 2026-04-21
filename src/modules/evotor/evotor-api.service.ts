import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EvotorRemoteProduct {
  id: string;
  article_number: string;
  name: string;
  price: number;
  quantity: number;
}

export interface EvotorUpsertProduct {
  id: string;
  article_number: string;
  name: string;
  price: number;
  quantity: number;
}

@Injectable()
export class EvotorApiService {
  constructor(private readonly configService: ConfigService) {}

  async seedStore(
    shopId: string,
    productCount = 0,
    documentCount = 0,
    catalogPreset: 'default' | 'electronics' | 'fashion' | 'grocery' = 'default',
  ): Promise<void> {
    await this.request('/mock/seed', {
      method: 'POST',
      body: JSON.stringify({
        storeId: shopId,
        productCount,
        documentCount,
        catalogPreset,
      }),
    });
  }

  async getProducts(storeId: string): Promise<EvotorRemoteProduct[]> {
    const response = await this.request<{ items: EvotorRemoteProduct[] }>(`/stores/${storeId}/products`);
    return response.items;
  }

  async upsertProducts(storeId: string, products: EvotorUpsertProduct[]): Promise<void> {
    await this.request(`/stores/${storeId}/products`, {
      method: 'PUT',
      body: JSON.stringify(products),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = this.configService.get<string>('EVOTOR_BASE_URL') ?? 'http://localhost:3001';
    const token = this.configService.get<string>('EVOTOR_TOKEN') ?? 'mock-evotor-token';
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new UnauthorizedException('Evotor mock request unauthorized');
      }

      throw new Error(`Evotor mock request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
