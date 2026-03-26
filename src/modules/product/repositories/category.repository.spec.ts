import { Category } from '../entities';
import { CategoryRepository } from './category.repository';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let typeormRepo: DeepMocked<Repository<Category>>;

  const mockCategory = {
    id: 'cat-1',
    shopId: 'shop-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic items',
    parentId: null,
    parent: null,
    shop: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as Category;

  beforeEach(async () => {
    typeormRepo = createMock<Repository<Category>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryRepository, { provide: getRepositoryToken(Category), useValue: typeormRepo }],
    }).compile();

    repository = module.get<CategoryRepository>(CategoryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByShop', () => {
    it('should return categories ordered by name', async () => {
      typeormRepo.find.mockResolvedValue([mockCategory]);

      const result = await repository.findAllByShop('shop-1');

      expect(typeormRepo.find).toHaveBeenCalledWith({
        where: { shopId: 'shop-1' },
        order: { name: 'ASC' },
      });
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('findBySlug', () => {
    it('should return category by shop and slug', async () => {
      typeormRepo.findOne.mockResolvedValue(mockCategory);

      const result = await repository.findBySlug('shop-1', 'electronics');

      expect(typeormRepo.findOne).toHaveBeenCalledWith({
        where: { shopId: 'shop-1', slug: 'electronics' },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should return null when not found', async () => {
      typeormRepo.findOne.mockResolvedValue(null);

      const result = await repository.findBySlug('shop-1', 'missing');

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndShop', () => {
    it('should return category by id and shop', async () => {
      typeormRepo.findOne.mockResolvedValue(mockCategory);

      const result = await repository.findByIdAndShop('cat-1', 'shop-1');

      expect(typeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1', shopId: 'shop-1' },
      });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('existsBySlugAndShop', () => {
    it('should return true when exists', async () => {
      typeormRepo.existsBy.mockResolvedValue(true);

      const result = await repository.existsBySlugAndShop('shop-1', 'electronics');

      expect(typeormRepo.existsBy).toHaveBeenCalledWith({ shopId: 'shop-1', slug: 'electronics' });
      expect(result).toBe(true);
    });

    it('should return false when not exists', async () => {
      typeormRepo.existsBy.mockResolvedValue(false);

      const result = await repository.existsBySlugAndShop('shop-1', 'nope');

      expect(result).toBe(false);
    });
  });

  describe('countProductsInCategory', () => {
    it('should return product count', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
      };
      typeormRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await repository.countProductsInCategory('cat-1');

      expect(typeormRepo.createQueryBuilder).toHaveBeenCalledWith('category');
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'products',
        'product',
        'product.categoryId = category.id',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('category.id = :categoryId', { categoryId: 'cat-1' });
      expect(result).toBe(10);
    });
  });
});
