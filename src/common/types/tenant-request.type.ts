import { TokenPayload } from '@/core/auth/types/token-payload.type';

export interface TenantRequest {
  user: TokenPayload;
  tenant: {
    organizationId: string;
  };
}
