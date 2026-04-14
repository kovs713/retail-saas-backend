import { Tenant } from '@/common/decorators';
import { ApiResponse as AppApiResponse, Pagination, PaginationResponse } from '@/common/dto';
import { AuthGuard } from '@/common/guards';
import { TenantContext } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import {
  AddDocumentsDto,
  AddDocumentsResponseDto,
  AddTextsDto,
  AddTextsResponseDto,
  DocumentDto,
  DocumentResponseDto,
} from './dto';
import { RagService } from './rag.service';

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('RAG')
@ApiBearerAuth('JWT')
@Controller('rag')
@UseGuards(AuthGuard)
export class RagController {
  private readonly logger = new LoggerService(RagController.name);

  constructor(private readonly ragService: RagService) {}

  @Get('documents')
  @ApiOperation({ summary: 'Get all documents with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: DocumentDto,
    isArray: true,
  })
  async getDocuments(
    @Query() query: Pagination,
    @Tenant() tenantContext: TenantContext,
  ): Promise<PaginationResponse<DocumentResponseDto>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    this.logger.log(`Getting documents from shop with id ${tenantContext.shopId}`);
    const result = await this.ragService.getDocuments(tenantContext.shopId, page, limit);
    this.logger.log(`Received documents from shop with id ${tenantContext.shopId} successfully`);

    return result;
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add documents to RAG system' })
  @ApiBody({
    type: AddDocumentsDto,
    examples: {
      example: {
        summary: 'Add documents',
        value: {
          documents: [{ content: 'Document content', metadata: { source: 'test' } }],
          source: 'api',
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
  async addDocuments(
    @Body() addDocumentsRequest: AddDocumentsDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<AddDocumentsResponseDto>> {
    this.logger.log(`Adding ${addDocumentsRequest.documents.length} documents`);
    const documents = addDocumentsRequest.documents.map((doc) => ({
      pageContent: doc.content,
      metadata: {
        ...doc.metadata,
        source: addDocumentsRequest.source || 'api',
        timestamp: new Date().toISOString(),
      },
    }));
    const docIds = await this.ragService.addDocuments(documents, tenantContext.shopId);
    const response: AddDocumentsResponseDto = {
      documentIds: docIds,
      count: docIds.length,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`Added ${docIds.length} documents successfully`);

    return { success: true, data: response };
  }

  @Post('texts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add texts to RAG system' })
  @ApiBody({
    type: AddTextsDto,
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
  async addTexts(
    @Body() addTextsRequest: AddTextsDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<AddTextsResponseDto>> {
    this.logger.log(`Adding ${addTextsRequest.texts.length} texts`);
    const textIds = await this.ragService.addTexts(
      addTextsRequest.texts,
      tenantContext.shopId,
      addTextsRequest.metadata,
    );
    const response: AddTextsResponseDto = {
      textIds,
      count: textIds.length,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`Added ${textIds.length} texts successfully`);

    return { success: true, data: response };
  }

  @Delete('documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all documents from RAG system' })
  @ApiResponse({ status: 200, description: 'Documents cleared' })
  clearDocuments(@Tenant() tenantContext: TenantContext): AppApiResponse<void> {
    this.logger.log('Clearing all documents from RAG system');
    this.ragService.clearDocuments(tenantContext.shopId);
    this.logger.log('All documents cleared successfully');

    return { success: true, message: 'Documents cleared successfully' };
  }
}
