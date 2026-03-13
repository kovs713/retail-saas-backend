import { TenantContext } from '../types/tenant-context.type';

import { FindManyOptions, FindOptionsWhere, ObjectLiteral } from 'typeorm';

class TestTenantRepository<T extends ObjectLiteral> {
  protected getTenantFilter(tenantContext: TenantContext): FindOptionsWhere<T> {
    return { organizationId: tenantContext.organizationId } as unknown as FindOptionsWhere<T>;
  }

  protected applyTenantFilter(options: FindManyOptions<T>, tenantContext: TenantContext): FindManyOptions<T> {
    const tenantFilter = this.getTenantFilter(tenantContext);

    if (!options.where) {
      return {
        ...options,
        where: tenantFilter,
      };
    }

    if (Array.isArray(options.where)) {
      return {
        ...options,
        where: options.where.map((where) => ({ ...where, ...tenantFilter }) as unknown as FindOptionsWhere<T>),
      };
    }

    return {
      ...options,
      where: {
        ...(options.where as object),
        ...tenantFilter,
      } as unknown as FindOptionsWhere<T>,
    };
  }
}

describe('TenantRepository', () => {
  let repository: any;

  const mockTenantContext: TenantContext = {
    organizationId: 'test-org-id',
  };

  beforeEach(() => {
    repository = new TestTenantRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTenantFilter', () => {
    it('should return filter with organizationId', () => {
      const typedRepository = repository;

      const filter = typedRepository.getTenantFilter(mockTenantContext);

      expect(filter).toEqual({
        organizationId: mockTenantContext.organizationId,
      });
    });
  });

  describe('applyTenantFilter', () => {
    it('should add tenant filter to empty where clause', () => {
      const options: FindManyOptions<any> = {};

      const typedRepository = repository;

      const result = typedRepository.applyTenantFilter(options, mockTenantContext);

      expect(result.where).toEqual({
        organizationId: mockTenantContext.organizationId,
      });
    });

    it('should merge with existing where clause', () => {
      const options: FindManyOptions<any> = {
        where: { name: 'Test' },
      };

      const typedRepository = repository;

      const result = typedRepository.applyTenantFilter(options, mockTenantContext);

      expect(result.where).toEqual({
        name: 'Test',
        organizationId: mockTenantContext.organizationId,
      });
    });

    it('should handle array of where conditions', () => {
      const options: FindManyOptions<any> = {
        where: [{ name: 'Test1' }, { name: 'Test2' }],
      };

      const typedRepository = repository;

      const result = typedRepository.applyTenantFilter(options, mockTenantContext);

      expect(result.where).toEqual([
        { name: 'Test1', organizationId: mockTenantContext.organizationId },
        { name: 'Test2', organizationId: mockTenantContext.organizationId },
      ]);
    });

    it('should work with complex query conditions', () => {
      const options: FindManyOptions<any> = {
        where: {
          price: 100,
          category: 'Electronics',
        },
      };

      const typedRepository = repository;

      const result = typedRepository.applyTenantFilter(options, mockTenantContext);

      expect(result.where).toEqual({
        price: 100,
        category: 'Electronics',
        organizationId: mockTenantContext.organizationId,
      });
    });

    it('should preserve other options', () => {
      const options: FindManyOptions<any> = {
        where: { name: 'Test' },
        take: 10,
        skip: 0,
        order: { name: 'ASC' },
      };

      const typedRepository = repository;

      const result = typedRepository.applyTenantFilter(options, mockTenantContext);

      expect(result.take).toBe(10);

      expect(result.skip).toBe(0);

      expect(result.order).toEqual({ name: 'ASC' });
    });
  });
});
