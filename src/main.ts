import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

import { ChatChunkEventDto, ChatCompleteEventDto, ChatErrorEventDto, ChatMessageDto } from './modules/rag/dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  const corsOrigins = configService.getOrThrow<string>('CORS_ORIGINS', 'http://localhost:5173');

  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Retail SaaS API')
    .setDescription(
      'Multi-tenant SaaS backend for micro-business storefronts with RAG-powered AI chatbot and file storage',
    )
    .setVersion('1.0')
    .addTag('Auth', 'User authentication and authorization')
    .addTag('Shops', 'Shop profile management')
    .addTag('Products', 'Product catalog CRUD operations')
    .addTag('Public media', 'Public access to product media')
    .addTag('Public shop', 'Public shop information')
    .addTag('Public orders', 'Public order creation')
    .addTag('Admin orders', 'Admin order management')
    .addTag('Analytics', 'Analytics and reporting')
    .addTag('RAG', 'AI-powered document analysis and chat')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addCookieAuth('refreshToken')
    .addServer('http://localhost:3000', 'Development')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  const document = documentFactory();

  SwaggerModule.createDocument(app, config, {
    extraModels: [ChatMessageDto, ChatChunkEventDto, ChatCompleteEventDto, ChatErrorEventDto],
  });

  const wsPath = '/api/chat';
  document.paths = document.paths || {};
  document.paths[wsPath] = {
    post: {
      tags: ['RAG'],
      summary: 'WebSocket Chat Endpoint',
      description:
        'Connect to `ws://localhost:3000/chat` with JWT bearer token. Send `chat:message` events and receive `chat:chunk`, `chat:complete`, `chat:error` events.',
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ChatMessageDto' },
            example: {
              message: 'What products do you have?',
              sessionId: 'optional-session-id',
              maxResults: 5,
              systemPrompt: 'You are a helpful assistant.',
            } as ChatMessageDto,
          },
        },
      },
      responses: {
        '200': {
          description: 'Streaming response events',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/ChatChunkEventDto' },
                  { $ref: '#/components/schemas/ChatCompleteEventDto' },
                  { $ref: '#/components/schemas/ChatErrorEventDto' },
                ],
              },
              examples: {
                chunk: {
                  summary: 'Streaming chunk',
                  value: { sessionId: 'abc-123', chunk: 'We have ' },
                },
                complete: {
                  summary: 'Response complete',
                  value: {
                    sessionId: 'abc-123',
                    answer: 'We have electronics and clothing.',
                    sources: [{ content: 'Catalog page 1', metadata: { source: 'catalog' } }],
                    timestamp: '2024-01-01T00:00:00.000Z',
                  },
                },
                error: {
                  summary: 'Error response',
                  value: { message: 'Rate limit exceeded', code: 'RATE_LIMITED', retryAfter: 60 },
                },
              },
            },
          },
        },
        '401': { description: 'Unauthorized - Invalid or missing JWT token' },
      },
      security: [{ JWT: [] }],
    },
  };

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
