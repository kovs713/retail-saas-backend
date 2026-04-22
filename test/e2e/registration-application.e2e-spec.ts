import { AuthGuard, RolesGuard } from '@/common/guards';
import { createTokenPayload } from '@/core/database/factories';
import { RegistrationApplicationController } from '@/modules/registration-application/registration-application.controller';
import { RegistrationApplicationService } from '@/modules/registration-application/registration-application.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

describe('Registration Application E2E', () => {
  let app: INestApplication;
  let service: DeepMocked<RegistrationApplicationService>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [RegistrationApplicationController],
      providers: [{ provide: RegistrationApplicationService, useValue: createMock<RegistrationApplicationService>() }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = createTokenPayload({ overrides: { role: 'admin', shopId: '' } });
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    service = moduleRef.get(RegistrationApplicationService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists registration applications', async () => {
    service.list.mockResolvedValue([
      {
        id: 'app_001',
        email: 'new@example.com',
        shopName: 'New Shop',
        shopSlug: 'new-shop',
        status: 'pending',
        rejectionReason: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      } as any,
    ]);

    const response = await request(app.getHttpServer()).get('/admin/registration-applications').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('app_001');
  });

  it('approves registration application', async () => {
    service.approve.mockResolvedValue({
      id: 'app_001',
      email: 'new@example.com',
      shopName: 'New Shop',
      shopSlug: 'new-shop',
      status: 'approved',
      rejectionReason: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    } as any);

    const response = await request(app.getHttpServer())
      .post('/admin/registration-applications/app_001/approve')
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('approved');
  });

  it('rejects registration application', async () => {
    service.reject.mockResolvedValue({
      id: 'app_001',
      email: 'new@example.com',
      shopName: 'New Shop',
      shopSlug: 'new-shop',
      status: 'rejected',
      rejectionReason: 'Incomplete data',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    } as any);

    const response = await request(app.getHttpServer())
      .post('/admin/registration-applications/app_001/reject')
      .send({ reason: 'Incomplete data' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('rejected');
    expect(response.body.data.rejectionReason).toBe('Incomplete data');
  });
});
