import { TenantContext } from '@/common/types/tenant-context.type';

export function createMockTenantContext(
  overrides?: Partial<TenantContext>,
): TenantContext {
  return {
    shopId: 'test-shop-id',
    ...overrides,
  };
}
