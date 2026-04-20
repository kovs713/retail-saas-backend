import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      status: 'ok',
      stores: 0,
      products: 0,
      documents: 0,
      pendingWebhooks: 0,
      retailSaasUrl: process.env.RETAIL_SAAS_URL ?? 'http://backend:3000',
    };
  }
}
