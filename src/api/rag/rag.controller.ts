import { RagService } from '@/modules/rag/rag.service';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import {
  AddDocumentsRequestDto,
  AddDocumentsResponseDto,
  AddTextsRequestDto,
  AddTextsResponseDto,
  ChatRequestDto,
  ChatResponseDto,
  ChatWithScoresResponseDto,
} from './rag.dto';

@Controller('rag')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(private readonly ragService: RagService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() chatRequest: ChatRequestDto) {
    try {
      this.logger.log(
        `Chat request: ${chatRequest.message.substring(0, 100)}...`,
      );

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
      this.logger.error(
        `Chat error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @Post('chat-with-scores')
  @HttpCode(HttpStatus.OK)
  async chatWithScores(@Body() chatRequest: ChatRequestDto) {
    try {
      this.logger.log(
        `Chat with scores request: ${chatRequest.message.substring(0, 100)}...`,
      );

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

      this.logger.log(
        `Chat with scores response: ${result.answer.substring(0, 100)}...`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Chat with scores error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async addDocuments(@Body() addDocumentsRequest: AddDocumentsRequestDto) {
    try {
      this.logger.log(
        `Adding ${addDocumentsRequest.documents.length} documents`,
      );

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
      this.logger.error(
        `Add documents error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @Post('texts')
  @HttpCode(HttpStatus.CREATED)
  async addTexts(@Body() addTextsRequest: AddTextsRequestDto) {
    try {
      this.logger.log(`Adding ${addTextsRequest.texts.length} texts`);

      const textIds = await this.ragService.addTexts(
        addTextsRequest.texts,
        addTextsRequest.metadata,
      );

      const response: AddTextsResponseDto = {
        textIds: textIds,
        count: textIds.length,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(`Added ${textIds.length} texts successfully`);
      return response;
    } catch (error) {
      this.logger.error(
        `Add texts error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  @Delete('documents')
  @HttpCode(HttpStatus.OK)
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
      this.logger.error(
        `Clear documents error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}

// Response DTOs are now imported from rag.dto.ts

interface ClearDocumentsResponseDto {
  message: string;
  timestamp: string;
}
