import { Shop } from './entities/shop.entity';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { User } from '@/modules/user/entities/user.entity';
import { AuthGuard, RolesGuard } from '@/common/guards';

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

describe('ShopController', () => {
  let controller: ShopController;
  let service: ShopService;

  const mockShop: Shop = {
    id: 'shop-1',
    ownerId: 'owner-123',
    owner: null as unknown as User,
    name: 'Test Shop',
    slug: 'test-shop',
    description: null,
    address: null,
    phone: null,
    workingHours: null,
    logoUrl: null,
    bannerUrl: null,
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        {
          provide: ShopService,
          useValue: {
            create: jest.fn(),
            findBySlug: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            updateMediaUrls: jest.fn(),
          },
        },
        {
          provide: AuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-secret') },
        },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ShopController>(ShopController);
    service = module.get<ShopService>(ShopService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateShopDto = {
      name: 'Test Shop',
      slug: 'test-shop',
      ownerId: 'owner-123',
    };

    it('should create a shop successfully', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockShop);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockShop);
    });
  });

  describe('findBySlug', () => {
    it('should return a shop by slug', async () => {
      jest.spyOn(service, 'findBySlug').mockResolvedValue(mockShop);

      const result = await controller.findBySlug('test-shop');

      expect(service.findBySlug).toHaveBeenCalledWith('test-shop');
      expect(result).toEqual(mockShop);
    });
  });

  describe('findById', () => {
    it('should return a shop by id', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockShop);

      const result = await controller.findById('shop-1');

      expect(service.findById).toHaveBeenCalledWith('shop-1');
      expect(result).toEqual(mockShop);
    });
  });

  describe('update', () => {
    const updateDto: UpdateShopDto = {
      name: 'Updated Shop',
      description: 'Updated description',
    };

    it('should update a shop successfully', async () => {
      const updatedShop = { ...mockShop, ...updateDto };
      jest.spyOn(service, 'update').mockResolvedValue(updatedShop);

      const result = await controller.update('shop-1', updateDto);

      expect(service.update).toHaveBeenCalledWith('shop-1', updateDto);
      expect(result).toEqual(updatedShop);
    });
  });

  describe('updateMedia', () => {
    it('should update shop logo URL', async () => {
      const logoUrl = 'https://example.com/logo.png';
      const updatedShop = { ...mockShop, logoUrl };
      jest.spyOn(service, 'updateMediaUrls').mockResolvedValue(updatedShop);

      const result = await controller.updateMedia('shop-1', logoUrl);

      expect(service.updateMediaUrls).toHaveBeenCalledWith('shop-1', logoUrl, undefined);
      expect(result).toEqual(updatedShop);
    });

    it('should update shop banner URL', async () => {
      const bannerUrl = 'https://example.com/banner.png';
      const updatedShop = { ...mockShop, bannerUrl };
      jest.spyOn(service, 'updateMediaUrls').mockResolvedValue(updatedShop);

      const result = await controller.updateMedia('shop-1', undefined, bannerUrl);

      expect(service.updateMediaUrls).toHaveBeenCalledWith('shop-1', undefined, bannerUrl);
      expect(result).toEqual(updatedShop);
    });

    it('should update both logo and banner URLs', async () => {
      const logoUrl = 'https://example.com/logo.png';
      const bannerUrl = 'https://example.com/banner.png';
      const updatedShop = { ...mockShop, logoUrl, bannerUrl };
      jest.spyOn(service, 'updateMediaUrls').mockResolvedValue(updatedShop);

      const result = await controller.updateMedia('shop-1', logoUrl, bannerUrl);

      expect(service.updateMediaUrls).toHaveBeenCalledWith('shop-1', logoUrl, bannerUrl);
      expect(result).toEqual(updatedShop);
    });
  });
});
