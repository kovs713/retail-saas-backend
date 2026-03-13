import { TokenPayload } from '@/core/auth/types/token-payload.type';

export interface TenantRequest {
  user: TokenPayload & { organizationId: string };
  tenant: {
    organizationId: string;
  };
}
