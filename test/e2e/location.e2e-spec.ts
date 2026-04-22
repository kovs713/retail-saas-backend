import { AuthGuard, RolesGuard } from '@/common/guards';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { createTokenPayload } from '@/core/database/factories';
import { Location } from '@/modules/shop/entities';
import { ShopController } from '@/modules/shop/shop.controller';
import { ShopService } from '@/modules/shop/shop.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

describe('Location E2E', () => {
  let app: INestApplication;
  let service: DeepMocked<ShopService>;

  const mockUser = createTokenPayload({ sub: 'user_001', shopId: 'shop_001' });

  const mockLocation: Partial<Location> = {
    id: 'loc_001',
    shopId: 'shop_001',
    name: 'Main Branch',
    address: '123 Main St',
    phone: '+1234567890',
    workingHours: { monday: '9:00-18:00' },
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        { provide: ShopService, useValue: createMock<ShopService>() },
      ],
      controllers: [ShopController],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard(mockUser))
      .overrideGuard(RolesGuard)
      .useValue(mockGuard())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    service = app.get<DeepMocked<ShopService>>(ShopService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /shops/:shopId/locations', () => {
    it('should create a location', async () => {
      service.createLocation.mockResolvedValue(mockLocation as Location);

      const response = await request(app.getHttpServer())
        .post('/shops/shop_001/locations')
        .send({ name: 'Main Branch', address: '123 Main St' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Main Branch');
      expect(response.body.message).toBe('Location created successfully');
    });

    it('should return 400 when max locations reached', async () => {
      service.createLocation.mockRejectedValue(
        new BadRequestException('Maximum 3 active locations per shop'),
      );

      await request(app.getHttpServer())
        .post('/shops/shop_001/locations')
        .send({ name: 'New Branch' })
        .expect(400);
    });

    it('should return 404 for non-existent shop', async () => {
      service.findLocations.mockRejectedValue(
        new NotFoundException('Shop not found'),
      );

      await request(app.getHttpServer())
        .get('/shops/shop_001/locations')
        .expect(404);
    });
  });

  describe('GET /shops/:shopId/locations', () => {
    it('should return locations for a shop', async () => {
      service.findLocations.mockResolvedValue([mockLocation] as Location[]);

      const response = await request(app.getHttpServer())
        .get('/shops/shop_001/locations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Main Branch');
    });

    it('should return 404 for non-existent shop', async () => {
      service.createLocation.mockRejectedValue(
        new NotFoundException('Shop not found'),
      );

      await request(app.getHttpServer())
        .post('/shops/shop_001/locations')
        .send({ name: 'New Branch' })
        .expect(404);
    });
  });

  describe('GET /shops/:shopId/locations/:id', () => {
    it('should return a location by ID', async () => {
      service.findLocation.mockResolvedValue(mockLocation as Location);

      const response = await request(app.getHttpServer())
        .get('/shops/shop_001/locations/loc_001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('loc_001');
      expect(response.body.data.name).toBe('Main Branch');
    });

    it('should return 404 for non-existent location', async () => {
      service.findLocation.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await request(app.getHttpServer())
        .get('/shops/shop_001/locations/non-existent')
        .expect(404);
    });
  });

  describe('PATCH /shops/:shopId/locations/:id', () => {
    it('should update a location', async () => {
      service.updateLocation.mockResolvedValue({
        ...mockLocation,
        name: 'Updated Branch',
      } as Location);

      const response = await request(app.getHttpServer())
        .patch('/shops/shop_001/locations/loc_001')
        .send({ name: 'Updated Branch' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Branch');
    });

    it('should return 404 for non-existent location', async () => {
      service.updateLocation.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await request(app.getHttpServer())
        .patch('/shops/shop_001/locations/non-existent')
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /shops/:shopId/locations/:id', () => {
    it('should delete a location', async () => {
      service.deleteLocation.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete('/shops/shop_001/locations/loc_001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Location deleted successfully');
    });

    it('should return 404 for non-existent location', async () => {
      service.deleteLocation.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await request(app.getHttpServer())
        .delete('/shops/shop_001/locations/non-existent')
        .expect(404);
    });
  });
});
