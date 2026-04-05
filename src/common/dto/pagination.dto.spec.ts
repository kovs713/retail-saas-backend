import { Pagination } from './pagination.dto';

import { plainToInstance } from 'class-transformer';

describe('Pagination', () => {
  describe('Transform behavior', () => {
    it('should parse string page to integer', () => {
      const raw = { page: '3' };

      const dto = plainToInstance(Pagination, raw);

      expect(dto.page).toBe(3);
    });

    it('should parse string limit to integer', () => {
      const raw = { limit: '25' };

      const dto = plainToInstance(Pagination, raw);

      expect(dto.limit).toBe(25);
    });

    it('should handle numeric page and limit', () => {
      const raw = { page: 2, limit: 50 };

      const dto = plainToInstance(Pagination, raw);

      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(50);
    });
  });

  describe('Filter fields', () => {
    it('should accept category filter', () => {
      const raw = { category: 'Electronics' };

      const dto = plainToInstance(Pagination, raw);

      expect(dto.category).toBe('Electronics');
    });

    it('should accept price range filters', () => {
      const raw = { minPrice: 10, maxPrice: 100 };

      const dto = plainToInstance(Pagination, raw);

      expect(dto.minPrice).toBe(10);
      expect(dto.maxPrice).toBe(100);
    });

    it('should accept sort parameters', () => {
      const raw = { sortBy: 'price', sortOrder: 'DESC' };

      const dto = plainToInstance(Pagination, raw);

      expect(dto.sortBy).toBe('price');
      expect(dto.sortOrder).toBe('DESC');
    });

    it('should accept search term', () => {
      const raw = { search: 'Wireless' };

      const dto = plainToInstance(Pagination, raw);

      expect(dto.search).toBe('Wireless');
    });

    it('should handle all fields together', () => {
      const raw = {
        page: '1',
        limit: '10',
        category: 'Electronics',
        minPrice: 10,
        maxPrice: 100,
        sortBy: 'price',
        sortOrder: 'ASC',
        search: 'mouse',
      };

      const dto = plainToInstance(Pagination, raw);

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
      expect(dto.category).toBe('Electronics');
      expect(dto.minPrice).toBe(10);
      expect(dto.maxPrice).toBe(100);
      expect(dto.sortBy).toBe('price');
      expect(dto.sortOrder).toBe('ASC');
      expect(dto.search).toBe('mouse');
    });
  });
});
