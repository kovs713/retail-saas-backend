import { TenantContext } from '@/common/types/tenant-context.type';

export function createMockTenantContext(overrides?: Partial<TenantContext>): TenantContext {
  return {
    organizationId: 'test-org-id',
    ...overrides,
  };
}

export function createMockRequest(overrides?: { user: { organizationId: string } }) {
  return {
    user: {
      organizationId: 'test-org-id',
    },
    ...overrides,
  } as { user: { organizationId: string } };
}
