import { AuthModule } from '@/core/auth/auth.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';

describe('Storage E2E Tests', () => {
  let app: INestApplication;
  let postgresContainer: StartedTestContainer;

  let accessToken: string;
  let bucketName: string;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer('postgres:18-alpine')
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start();

    bucketName = 'test-bucket';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:9000',
              S3_USERNAME: process.env.S3_USERNAME || 'admin',
              S3_PASSWORD: process.env.S3_PASSWORD || 'password',
              S3_BUCKET: bucketName,
              S3_REGION: 'us-east-1',
              S3_USE_SSL: 'false',
              S3_PORT: process.env.S3_PORT || '9000',
              S3_HOST: process.env.S3_HOST || 'localhost',
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgresContainer.getHost(),
          port: postgresContainer.getMappedPort(5432),
          username: 'test',
          password: 'test',
          database: 'test_db',
          autoLoadEntities: true,
          synchronize: true,
          logging: false,
        }),
        AuthModule,
        StorageModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `storage-test-${Date.now()}@example.com`,
        password: 'password123',
        shopName: 'Storage Test Shop',
        shopSlug: `storage-test-shop-${Date.now()}`,
      })
      .expect(201);

    accessToken = registerResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await app?.close();
    await postgresContainer?.stop();
  });

  afterAll(async () => {
    await app?.close();
    await postgresContainer?.stop();
  });

  describe('POST /storage/upload', () => {
    it('should upload file successfully', async () => {
      const fileContent = 'Test file content for storage E2E test';
      const fileName = 'test-upload.txt';

      const response = await request(app.getHttpServer())
        .post('/storage/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from(fileContent), fileName)
        .field('bucket', bucketName)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('key');
      expect(response.body.data.key).toBe(fileName);
      expect(response.body.data).toHaveProperty('url');
    });

    it('should fail without file', async () => {
      await request(app.getHttpServer())
        .post('/storage/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const fileContent = 'Unauthorized upload test';

      await request(app.getHttpServer())
        .post('/storage/upload')
        .attach('file', Buffer.from(fileContent), 'unauthorized.txt')
        .expect(401);
    });
  });

  describe('GET /storage/files', () => {
    it('should list files in bucket', async () => {
      const response = await request(app.getHttpServer())
        .get('/storage/files')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('files');
      expect(Array.isArray(response.body.data.files)).toBe(true);
    });

    it('should filter files by prefix', async () => {
      const response = await request(app.getHttpServer())
        .get('/storage/files?prefix=test-')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toBeDefined();
    });
  });

  describe('GET /storage/metadata/:key', () => {
    const testFileName = 'metadata-test.txt';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/storage/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('Metadata test content'), testFileName)
        .field('bucket', bucketName)
        .expect(201);
    });

    it('should return file metadata', async () => {
      const response = await request(app.getHttpServer())
        .get(`/storage/metadata/${testFileName}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('key');
      expect(response.body.data.key).toBe(testFileName);
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('mimeType');
    });

    it('should return 404 for non-existent file', async () => {
      await request(app.getHttpServer())
        .get('/storage/metadata/non-existent-file.txt')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /storage/presigned/:key', () => {
    const testFileName = 'presigned-test.txt';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/storage/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('Presigned URL test content'), testFileName)
        .field('bucket', bucketName)
        .expect(201);
    });

    it('should generate presigned URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/storage/presigned/${testFileName}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url');
      expect(typeof response.body.data.url).toBe('string');
      expect(response.body.data.url).toContain(testFileName);
    });

    it('should generate presigned PUT URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/storage/presigned-put/${testFileName}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url');
    });

    it('should respect expiry time', async () => {
      const response = await request(app.getHttpServer())
        .get(`/storage/presigned/${testFileName}?expirySeconds=3600`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBeDefined();
    });
  });

  describe('DELETE /storage/:key', () => {
    const testFileName = 'delete-test.txt';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/storage/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('File to be deleted'), testFileName)
        .field('bucket', bucketName)
        .expect(201);
    });

    it('should delete file successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/storage/${testFileName}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bucket: bucketName })
        .expect(200);

      expect(response.body.success).toBe(true);

      await request(app.getHttpServer())
        .get(`/storage/metadata/${testFileName}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent file', async () => {
      await request(app.getHttpServer())
        .delete('/storage/non-existent-file.txt')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bucket: bucketName })
        .expect(404);
    });
  });

  describe('GET /storage/download/:key', () => {
    const testFileName = 'download-test.txt';
    const fileContent = 'Content to download';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/storage/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from(fileContent), testFileName)
        .field('bucket', bucketName)
        .expect(201);
    });

    it('should download file successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/storage/download/${testFileName}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data.metadata.key).toBe(testFileName);
    });

    it('should return correct content type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/storage/download/${testFileName}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.metadata).toHaveProperty('mimeType');
    });

    it('should return 404 for non-existent file', async () => {
      await request(app.getHttpServer())
        .get('/storage/download/non-existent-file.txt')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
