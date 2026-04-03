import { Order } from '../entities';
import { OrderRepository } from './order.repository';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('OrderRepository', () => {
  let repository: OrderRepository;
  let orderRepo: DeepMocked<OrderRepository>;

  const mockShopId = 'shop-123';
  const mockOrderId = 'order-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderRepository,
        {
          provide: getRepositoryToken(Order),
          useValue: createMock<OrderRepository>(),
        },
      ],
    }).compile();

    repository = module.get<OrderRepository>(OrderRepository);
    orderRepo = module.get<DeepMocked<OrderRepository>>(getRepositoryToken(Order));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByShopId', () => {
    it('should find orders by shopId with default pagination', async () => {
      const mockOrders = [{ id: mockOrderId, shopId: mockShopId }] as Order[];
      const mockTotal = 1;

      orderRepo.findAndCount.mockResolvedValue([mockOrders, mockTotal]);

      const result = await repository.findByShopId(mockShopId);

      expect(orderRepo.findAndCount).toHaveBeenCalledWith({
        where: { shopId: mockShopId },
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockOrders, mockTotal]);
    });

    it('should find orders by shopId with custom pagination', async () => {
      const mockOrders = [{ id: mockOrderId, shopId: mockShopId }] as Order[];
      const mockTotal = 1;

      orderRepo.findAndCount.mockResolvedValue([mockOrders, mockTotal]);

      const result = await repository.findByShopId(mockShopId, {
        page: 2,
        limit: 10,
      });

      expect(orderRepo.findAndCount).toHaveBeenCalledWith({
        where: { shopId: mockShopId },
        skip: 10,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockOrders, mockTotal]);
    });

    it('should filter by status when provided', async () => {
      const mockOrders = [{ id: mockOrderId, shopId: mockShopId, status: 'PENDING' }] as Order[];
      const mockTotal = 1;

      orderRepo.findAndCount.mockResolvedValue([mockOrders, mockTotal]);

      const result = await repository.findByShopId(mockShopId, {
        status: 'PENDING',
      });

      expect(orderRepo.findAndCount).toHaveBeenCalledWith({
        where: { shopId: mockShopId, status: 'PENDING' },
        skip: 0,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockOrders, mockTotal]);
    });
  });

  describe('findByIdAndShopId', () => {
    it('should find order by id and shopId', async () => {
      const mockOrder = { id: mockOrderId, shopId: mockShopId } as Order;

      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await repository.findByIdAndShopId(mockOrderId, mockShopId);

      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockOrderId, shopId: mockShopId },
      });
      expect(result).toBe(mockOrder);
    });

    it('should return null when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByIdAndShopId(mockOrderId, mockShopId);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find order by id', async () => {
      const mockOrder = { id: mockOrderId } as Order;

      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await repository.findById(mockOrderId);

      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockOrderId },
      });
      expect(result).toBe(mockOrder);
    });

    it('should return null when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(mockOrderId);

      expect(result).toBeNull();
    });
  });
});
