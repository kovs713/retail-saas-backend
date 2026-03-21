import { AuthModule } from '@/core/auth/auth.module';
import { RagModule } from '@/modules/rag/rag.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { UserModule } from '@/modules/user/user.module';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';

describe('RAG E2E Tests', () => {
  let app: INestApplication;
  let postgresContainer: StartedTestContainer;

  let accessToken: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _shopId: string;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer('postgres:18-alpine')
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              CHROMA_URL: process.env.CHROMA_URL || 'http://localhost:8000',
              GROQ_API_KEY: process.env.GROQ_API_KEY || 'mock-api-key',
              LLM_MODEL: process.env.LLM_MODEL || 'llama-3.1-70b-versatile',
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
        UserModule,
        ShopModule,
        RagModule,
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
        email: `rag-test-${Date.now()}@example.com`,
        password: 'password123',
        shopName: 'RAG Test Shop',
        shopSlug: `rag-test-shop-${Date.now()}`,
      })
      .expect(201);

    accessToken = registerResponse.body.data.accessToken;
    _shopId = registerResponse.body.data.shopId;
  });

  afterAll(async () => {
    await app?.close();
    await postgresContainer?.stop();
  });

  describe('POST /rag/documents', () => {
    it('should add documents to collection', async () => {
      const documents = {
        documents: [
          {
            pageContent:
              'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.',
            metadata: { source: 'nestjs-docs', category: 'framework' },
          },
          {
            pageContent: 'TypeScript is a strongly typed programming language that builds on JavaScript.',
            metadata: { source: 'typescript-docs', category: 'language' },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/rag/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(documents)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('documentIds');
      expect(response.body.data.documentIds).toHaveLength(2);
    });

    it('should add multiple documents', async () => {
      const documents = {
        documents: [
          { pageContent: 'Document 1 content', metadata: { id: '1' } },
          { pageContent: 'Document 2 content', metadata: { id: '2' } },
          { pageContent: 'Document 3 content', metadata: { id: '3' } },
          { pageContent: 'Document 4 content', metadata: { id: '4' } },
          { pageContent: 'Document 5 content', metadata: { id: '5' } },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/rag/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(documents)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documentIds).toHaveLength(5);
    });

    it('should handle metadata', async () => {
      const documents = {
        documents: [
          {
            pageContent: 'Test with metadata',
            metadata: {
              source: 'test-source',
              author: 'test-author',
              timestamp: new Date().toISOString(),
              tags: ['test', 'rag', 'e2e'],
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/rag/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(documents)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documentIds).toHaveLength(1);
    });

    it('should fail without authentication', async () => {
      const documents = {
        documents: [{ pageContent: 'Unauthorized document', metadata: {} }],
      };

      await request(app.getHttpServer()).post('/rag/documents').send(documents).expect(401);
    });

    it('should fail with empty documents array', async () => {
      const documents = {
        documents: [],
      };

      await request(app.getHttpServer())
        .post('/rag/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(documents)
        .expect(400);
    });
  });

  describe('POST /rag/texts', () => {
    it('should add texts directly', async () => {
      const texts = {
        texts: ['Simple text content without metadata', 'Another text entry for testing'],
      };

      const response = await request(app.getHttpServer())
        .post('/rag/texts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(texts)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('textIds');
      expect(response.body.data.textIds).toHaveLength(2);
    });

    it('should return text IDs', async () => {
      const texts = {
        texts: ['Test text 1', 'Test text 2', 'Test text 3'],
      };

      const response = await request(app.getHttpServer())
        .post('/rag/texts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(texts)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.textIds).toBeDefined();
      expect(Array.isArray(response.body.data.textIds)).toBe(true);
      response.body.data.textIds.forEach((id: string) => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty texts array', async () => {
      const texts = {
        texts: [],
      };

      const response = await request(app.getHttpServer())
        .post('/rag/texts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(texts)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.textIds).toHaveLength(0);
    });
  });

  describe('POST /rag/chat', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/rag/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documents: [
            {
              pageContent:
                'NestJS is built with TypeScript and provides excellent developer experience with decorators and dependency injection.',
              metadata: { source: 'nestjs' },
            },
            {
              pageContent: 'Express.js is a minimal and flexible Node.js web application framework.',
              metadata: { source: 'express' },
            },
            {
              pageContent: 'Fastify is a fast and low overhead web framework for Node.js.',
              metadata: { source: 'fastify' },
            },
          ],
        })
        .expect(201);
    });

    it('should chat with documents', async () => {
      const chatRequest = {
        message: 'What is NestJS?',
        maxResults: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/rag/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('answer');
      expect(typeof response.body.data.answer).toBe('string');
    });

    it('should return sources with answer', async () => {
      const chatRequest = {
        message: 'Tell me about Node.js frameworks',
        maxResults: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/rag/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sources');
      expect(Array.isArray(response.body.data.sources)).toBe(true);
    });

    it('should respect maxResults parameter', async () => {
      const chatRequest = {
        message: 'What frameworks exist?',
        maxResults: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/rag/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sources.length).toBeLessThanOrEqual(2);
    });

    it('should handle empty document collection', async () => {
      const tenant2Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `rag-empty-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'RAG Empty Shop',
          shopSlug: `rag-empty-shop-${Date.now()}`,
        })
        .expect(201);

      const tenant2Token = tenant2Response.body.data.accessToken;

      const chatRequest = {
        message: 'What is this?',
        maxResults: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/rag/chat')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send(chatRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.answer).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const chatRequest = {
        message: 'Test message',
        maxResults: 3,
      };

      await request(app.getHttpServer()).post('/rag/chat').send(chatRequest).expect(401);
    });
  });

  describe('POST /rag/chat-with-scores', () => {
    it('should return scores with sources', async () => {
      const chatRequest = {
        message: 'What is NestJS used for?',
        maxResults: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/rag/chat-with-scores')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('answer');
      expect(response.body.data).toHaveProperty('sources');

      if (response.body.data.sources.length > 0) {
        expect(response.body.data.sources[0]).toHaveProperty('score');
        expect(typeof response.body.data.sources[0].score).toBe('number');
        expect(response.body.data.sources[0]).toHaveProperty('document');
      }
    });

    it('should return scores between 0 and 1', async () => {
      const chatRequest = {
        message: 'Test query',
        maxResults: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/rag/chat-with-scores')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      response.body.data.sources.forEach((source: any) => {
        expect(source.score).toBeGreaterThanOrEqual(0);
        expect(source.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('GET /rag/stats', () => {
    it('should return collection statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/rag/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(typeof response.body.data.count).toBe('number');
      expect(response.body.data.count).toBeGreaterThan(0);
    });

    it('should include collection info', async () => {
      const response = await request(app.getHttpServer())
        .get('/rag/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('collectionName');
    });
  });

  describe('DELETE /rag/documents', () => {
    it('should clear all documents', async () => {
      const response = await request(app.getHttpServer())
        .delete('/rag/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
    });

    it('should handle empty collection', async () => {
      const response = await request(app.getHttpServer())
        .delete('/rag/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).delete('/rag/documents').expect(401);
    });
  });

  describe('Multi-tenant RAG Isolation', () => {
    let tenant2Token: string;
    let tenant1DocCount: number;

    beforeAll(async () => {
      const tenant2Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `rag-tenant2-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'RAG Tenant 2 Shop',
          shopSlug: `rag-tenant2-shop-${Date.now()}`,
        })
        .expect(201);

      tenant2Token = tenant2Response.body.data.accessToken;

      const statsResponse = await request(app.getHttpServer())
        .get('/rag/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      tenant1DocCount = statsResponse.body.data.count;
    });

    it('should isolate document collections by tenant', async () => {
      const tenant2Stats = await request(app.getHttpServer())
        .get('/rag/stats')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .expect(200);

      expect(tenant2Stats.body.success).toBe(true);
      expect(tenant2Stats.body.data.count).toBe(0);
      expect(tenant2Stats.body.data.count).not.toBe(tenant1DocCount);
    });

    it('should not query other tenant documents', async () => {
      const chatRequest = {
        message: 'What is NestJS?',
        maxResults: 10,
      };

      const tenant2Response = await request(app.getHttpServer())
        .post('/rag/chat')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send(chatRequest)
        .expect(201);

      expect(tenant2Response.body.success).toBe(true);
      expect(tenant2Response.body.data.sources).toHaveLength(0);
    });

    it('should add documents to separate collections', async () => {
      await request(app.getHttpServer())
        .post('/rag/documents')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          documents: [{ pageContent: 'Tenant 2 document', metadata: { tenant: '2' } }],
        })
        .expect(201);

      const tenant1Stats = await request(app.getHttpServer())
        .get('/rag/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const tenant2Stats = await request(app.getHttpServer())
        .get('/rag/stats')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .expect(200);

      expect(tenant1Stats.body.data.count).toBe(tenant1DocCount);
      expect(tenant2Stats.body.data.count).toBe(1);
    });
  });

  describe('RAG Error Handling', () => {
    it('should handle invalid chat request', async () => {
      const chatRequest = {
        message: '',
        maxResults: 3,
      };

      await request(app.getHttpServer())
        .post('/rag/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(400);
    });

    it('should handle invalid maxResults', async () => {
      const chatRequest = {
        message: 'Test',
        maxResults: -1,
      };

      await request(app.getHttpServer())
        .post('/rag/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(400);
    });

    it('should handle missing message in chat', async () => {
      const chatRequest = {
        maxResults: 3,
      };

      await request(app.getHttpServer())
        .post('/rag/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(400);
    });
  });
});
