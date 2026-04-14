import { Tenant } from '@/common/decorators';
import { ApiResponse as AppApiResponse, Pagination, PaginationResponse } from '@/common/dto';
import { AuthGuard } from '@/common/guards';
import { TenantContext } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { TargetDocumentType } from '@/modules/doc-preprocessor/dto';
import { DocPreprocessorService } from '@/modules/doc-preprocessor/doc-preprocessor.service';
import {
  AddDocumentsDto,
  AddDocumentsResponseDto,
  AddTextsDto,
  AddTextsResponseDto,
  DocumentDto,
  DocumentResponseDto,
  UploadRagDocumentDto,
} from './dto';
import { RagService } from './rag.service';

import { Document } from '@langchain/core/documents';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Express } from 'express';

@ApiTags('RAG')
@ApiBearerAuth('JWT')
@Controller('rag')
@UseGuards(AuthGuard)
export class RagController {
  private readonly logger = new LoggerService(RagController.name);
  private static readonly allowedExtensions = new Set(['pdf', 'docx', 'md', 'txt']);
  private static readonly allowedMimeTypes = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'text/plain',
  ]);

  constructor(
    private readonly ragService: RagService,
    private readonly docPreprocessorService: DocPreprocessorService,
    private readonly configService: ConfigService,
  ) {}

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

  @Post('documents/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload document, preprocess it, and ingest into RAG' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        targetType: { type: 'string', enum: ['txt', 'md', 'json', 'docx'], default: 'json' },
        sourceType: { type: 'string', enum: ['txt', 'md', 'json', 'docx', 'pdf'] },
        removeNoise: { type: 'boolean', default: true },
        normalizeWhitespace: { type: 'boolean', default: true },
        lowercase: { type: 'boolean', default: false },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document ingested', type: AddDocumentsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file or request payload' })
  @ApiResponse({ status: 422, description: 'Processed document is empty' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadRagDocumentDto,
    @Tenant() tenantContext: TenantContext,
  ): Promise<AppApiResponse<AddDocumentsResponseDto>> {
    this.validateUploadedFile(file);

    const processed = await this.docPreprocessorService.preprocess(file, {
      ...dto,
      targetType: TargetDocumentType.JSON,
    });
    const text = this.extractProcessedText(processed.buffer, processed.contentType);

    if (!text.trim()) {
      throw new UnprocessableEntityException('Processed document is empty');
    }

    const documents: Document[] = [
      {
        pageContent: text,
        metadata: {
          filename: file.originalname,
          contentType: file.mimetype,
          source: 'upload',
          origin: 'doc-preprocessor',
          uploadedAt: new Date().toISOString(),
          preprocess: {
            removeNoise: dto.removeNoise ?? true,
            normalizeWhitespace: dto.normalizeWhitespace ?? true,
            lowercase: dto.lowercase ?? false,
          },
        },
      },
    ];

    const documentIds = await this.ragService.addDocuments(documents, tenantContext.shopId);

    return {
      success: true,
      data: {
        documentIds,
        count: documentIds.length,
        timestamp: new Date().toISOString(),
      },
    };
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
  async clearDocuments(@Tenant() tenantContext: TenantContext): Promise<AppApiResponse<void>> {
    this.logger.log('Clearing all documents from RAG system');
    await this.ragService.clearDocuments(tenantContext.shopId);
    this.logger.log('All documents cleared successfully');

    return { success: true, message: 'Documents cleared successfully' };
  }

  private validateUploadedFile(file?: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const maxUploadSizeMb = Number(this.configService.get<string>('UPLOAD_MAX_MB') ?? 5);
    if (file.size > maxUploadSizeMb * 1024 * 1024) {
      throw new BadRequestException(`File too large. Max size is ${maxUploadSizeMb}MB`);
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (
      !extension ||
      !RagController.allowedExtensions.has(extension) ||
      !RagController.allowedMimeTypes.has(file.mimetype)
    ) {
      throw new BadRequestException('Unsupported file type');
    }
  }

  private extractProcessedText(buffer: Buffer, contentType: string): string {
    if (contentType.includes('application/json')) {
      const payload = JSON.parse(buffer.toString('utf-8')) as { text?: unknown };
      return typeof payload.text === 'string' ? payload.text : '';
    }

    return buffer.toString('utf-8');
  }
}
