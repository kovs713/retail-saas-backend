import { OpenAPIObject } from '@nestjs/swagger';

import {
  ChatChunkEventDto,
  ChatCompleteEventDto,
  ChatErrorEventDto,
  ChatMessageDto,
} from '@/modules/rag/dto';

export function registerWebSocketDocs(document: OpenAPIObject): void {
  document.components = document.components || {};
  document.components.schemas = document.components.schemas || {};

  const schemas = [
    ChatMessageDto,
    ChatChunkEventDto,
    ChatCompleteEventDto,
    ChatErrorEventDto,
  ];
  for (const dto of schemas) {
    const name = dto.name;
    document.components.schemas[name] = {
      type: 'object',
      properties: {},
    };
  }

  const wsPath = '/chat';
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
                    sources: [
                      {
                        content: 'Catalog page 1',
                        metadata: { source: 'catalog' },
                      },
                    ],
                    timestamp: '2024-01-01T00:00:00.000Z',
                  },
                },
                error: {
                  summary: 'Error response',
                  value: {
                    message: 'Rate limit exceeded',
                    code: 'RATE_LIMITED',
                    retryAfter: 60,
                  },
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
}
