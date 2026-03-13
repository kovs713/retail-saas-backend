import { TenantContext } from '../types/tenant-context.type';

import { FindManyOptions, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

export abstract class TenantRepository<T extends ObjectLiteral> extends Repository<T> {
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
