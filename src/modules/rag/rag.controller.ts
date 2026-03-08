import { RagService } from '@/modules/rag/rag.service';
import {
  AddDocumentsRequestDto,
  AddDocumentsResponseDto,
  AddTextsRequestDto,
  AddTextsResponseDto,
  ChatRequestDto,
  ChatResponseDto,
  ChatWithScoresResponseDto,
} from './dto';

import { Body, Controller, Delete, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('RAG')
@ApiBearerAuth('JWT')
@Controller('rag')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(private readonly ragService: RagService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with AI using RAG' })
  @ApiBody({
    type: ChatRequestDto,
    examples: {
      default: {
        summary: 'Basic chat',
        value: { message: 'What is NestJS?', maxResults: 5 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ChatResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async chat(@Body() chatRequest: ChatRequestDto) {
    try {
      this.logger.log(`Chat request: ${chatRequest.message.substring(0, 100)}...`);
      const result = await this.ragService.query(
        chatRequest.message,
        chatRequest.maxResults || 5,
        chatRequest.systemPrompt,
      );
      const response: ChatResponseDto = {
        answer: result.answer,
        sources: result.sources.map((source) => ({
          content: source.pageContent,
          metadata: source.metadata,
        })),
        timestamp: new Date().toISOString(),
      };
      this.logger.log(`Chat response: ${result.answer.substring(0, 100)}...`);

      return response;
    } catch (error) {
      this.logger.error(`Chat error: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Post('chat-with-scores')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with AI and get relevance scores' })
  @ApiBody({
    type: ChatRequestDto,
    examples: {
      example: {
        summary: 'Chat with scores',
        value: { message: 'What are vector databases?', maxResults: 5 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ChatWithScoresResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async chatWithScores(@Body() chatRequest: ChatRequestDto) {
    try {
      this.logger.log(`Chat with scores request: ${chatRequest.message.substring(0, 100)}...`);
      const result = await this.ragService.queryWithScores(
        chatRequest.message,
        chatRequest.maxResults || 5,
        chatRequest.systemPrompt,
      );
      const response: ChatWithScoresResponseDto = {
        answer: result.answer,
        sources: result.sources.map((source) => ({
          document: {
            content: source.document.pageContent,
            metadata: source.document.metadata,
          },
          score: source.score,
        })),
        timestamp: new Date().toISOString(),
      };
      this.logger.log(`Chat with scores response: ${result.answer.substring(0, 100)}...`);

      return response;
    } catch (error) {
      this.logger.error(`Chat with scores error: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add documents to RAG system' })
  @ApiBody({
    type: AddDocumentsRequestDto,
    examples: {
      example: {
        summary: 'Add documents',
        value: {
          source: 'docs',
          documents: [
            {
              content: 'NestJS is a Node.js framework',
              metadata: { category: 'framework' },
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documents added',
    type: AddDocumentsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async addDocuments(@Body() addDocumentsRequest: AddDocumentsRequestDto) {
    try {
      this.logger.log(`Adding ${addDocumentsRequest.documents.length} documents`);
      const documents = addDocumentsRequest.documents.map((doc) => ({
        pageContent: doc.content,
        metadata: {
          ...doc.metadata,
          source: addDocumentsRequest.source || 'api',
          timestamp: new Date().toISOString(),
        },
      }));
      const docIds = await this.ragService.addDocuments(documents);
      const response: AddDocumentsResponseDto = {
        documentIds: docIds,
        count: docIds.length,
        timestamp: new Date().toISOString(),
      };
      this.logger.log(`Added ${docIds.length} documents successfully`);

      return response;
    } catch (error) {
      this.logger.error(`Add documents error: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Post('texts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add texts to RAG system' })
  @ApiBody({
    type: AddTextsRequestDto,
    examples: {
      example: {
        summary: 'Add texts',
        value: {
          texts: ['Text 1', 'Text 2'],
          metadata: [{ category: 'notes' }],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Texts added',
    type: AddTextsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async addTexts(@Body() addTextsRequest: AddTextsRequestDto) {
    try {
      this.logger.log(`Adding ${addTextsRequest.texts.length} texts`);
      const textIds = await this.ragService.addTexts(addTextsRequest.texts, addTextsRequest.metadata);
      const response: AddTextsResponseDto = {
        textIds,
        count: textIds.length,
        timestamp: new Date().toISOString(),
      };
      this.logger.log(`Added ${textIds.length} texts successfully`);

      return response;
    } catch (error) {
      this.logger.error(`Add texts error: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  @Delete('documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all documents' })
  @ApiResponse({
    status: 200,
    description: 'Documents cleared',
    example: {
      message: 'All documents cleared successfully',
      timestamp: '2024-01-01T00:00:00.000Z',
    },
  })
  clearDocuments() {
    try {
      this.logger.log('Clearing all documents from RAG system');
      this.ragService.clearDocuments();
      const response: ClearDocumentsResponseDto = {
        message: 'All documents cleared successfully',
        timestamp: new Date().toISOString(),
      };
      this.logger.log('Documents cleared successfully');

      return response;
    } catch (error) {
      this.logger.error(`Clear documents error: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}

interface ClearDocumentsResponseDto {
  message: string;
  timestamp: string;
}
