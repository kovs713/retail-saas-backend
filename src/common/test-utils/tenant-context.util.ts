import { TenantContext } from '../types/tenant-context.type';

export function createMockTenantContext(overrides?: Partial<TenantContext>): TenantContext {
  return {
    organizationId: 'test-org-id',
    ...overrides,
  };
}
