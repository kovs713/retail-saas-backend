import { TenantRepository } from './base-tenant.repository';
import { TenantContext } from '../types/tenant-context.type';

import { createMock } from '@golevelup/ts-jest';
import { FindManyOptions, Repository } from 'typeorm';

class TestRepository extends TenantRepository<any> {}

describe('TenantRepository', () => {
  let repository: TestRepository;
  let mockRepository: Repository<any>;

  const mockTenantContext: TenantContext = {
    organizationId: 'test-org-id',
  };

  beforeEach(() => {
    mockRepository = createMock<Repository<any>>();
    repository = new TestRepository();
    Object.assign(repository, mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTenantFilter', () => {
    it('should return filter with organizationId', () => {
      const filter = (repository as any).getTenantFilter(mockTenantContext);

      expect(filter).toEqual({
        organizationId: mockTenantContext.organizationId,
      });
    });
  });

  describe('applyTenantFilter', () => {
    it('should add tenant filter to empty where clause', () => {
      const options: FindManyOptions<any> = {};

      const result = (repository as any).applyTenantFilter(options, mockTenantContext);

      expect(result.where).toEqual({
        organizationId: mockTenantContext.organizationId,
      });
    });

    it('should merge with existing where clause', () => {
      const options: FindManyOptions<any> = {
        where: { name: 'Test' },
      };

      const result = (repository as any).applyTenantFilter(options, mockTenantContext);

      expect(result.where).toEqual({
        name: 'Test',
        organizationId: mockTenantContext.organizationId,
      });
    });

    it('should handle array of where conditions', () => {
      const options: FindManyOptions<any> = {
        where: [{ name: 'Test1' }, { name: 'Test2' }],
      };

      const result = (repository as any).applyTenantFilter(options, mockTenantContext);

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

      const result = (repository as any).applyTenantFilter(options, mockTenantContext);

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

      const result = (repository as any).applyTenantFilter(options, mockTenantContext);

      expect(result.take).toBe(10);
      expect(result.skip).toBe(0);
      expect(result.order).toEqual({ name: 'ASC' });
    });
  });
});
