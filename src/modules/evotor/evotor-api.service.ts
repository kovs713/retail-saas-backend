import { EvotorConfig, EvotorOptions } from '@/common/types';
import { RemoteProduct, UpsertProduct } from './dto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class EvotorApiService {
  constructor(
    @Inject(EvotorConfig)
    private readonly evotorConfig: EvotorOptions,
  ) {}

  async getProducts(storeId: string): Promise<RemoteProduct[]> {
    const response = await this.request<{ items: RemoteProduct[] }>(
      `/stores/${storeId}/products`,
    );
    return response.items;
  }

  async upsertProducts(
    storeId: string,
    products: UpsertProduct[],
  ): Promise<void> {
    await this.request(`/stores/${storeId}/products`, {
      method: 'PUT',
      body: JSON.stringify(products),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = this.evotorConfig.baseUrl;
    const token = this.evotorConfig.token;
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Authorization': token,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new UnauthorizedException('Evotor API request unauthorized');
      }

      throw new Error(
        `Evotor API request failed with status ${response.status}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
