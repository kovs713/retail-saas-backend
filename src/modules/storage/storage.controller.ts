import { ApiResponse as AppApiResponse } from '@/common/types/api-response.type';
import {
  DeleteFileRequestDto,
  DeleteFileResponseDto,
  FileMetadataResponseDto,
  GetFileMetadataDto,
  GetPresignedUrlDto,
  ListFilesDto,
  ListFilesResponseDto,
  PresignedUrlResponseDto,
  UploadFileDto,
  UploadFileResponseDto,
} from './dto';
import { StorageService } from './storage.service';

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Storage')
@ApiBearerAuth('JWT')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a file to S3 storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        bucket: {
          type: 'string',
          description: 'Custom bucket name (optional)',
          example: 'my-bucket',
        },
      },
    },
    examples: {
      default: {
        summary: 'Upload a file',
        value: { file: 'binary_file_data', bucket: 'my-bucket' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file or missing required fields' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: UploadFileDto,
  ): Promise<AppApiResponse<UploadFileResponseDto>> {
    this.logger.log(`Uploading file: ${file.originalname}`);
    const result = await this.storageService.uploadFile({
      file,
      bucket: query.bucket,
    });
    const response: UploadFileResponseDto = {
      url: result.url,
      key: result.key,
      metadata: this.toFileMetadataDto(result.metadata),
    };
    this.logger.log(`File uploaded successfully: ${file.originalname}`);
    return { success: true, data: response };
  }

  @Get('files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List files in storage' })
  @ApiQuery({ name: 'prefix', required: false, type: String, description: 'File prefix filter', example: 'documents/' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum files to return',
    example: 50,
    default: 10,
  })
  @ApiQuery({
    name: 'startAfter',
    required: false,
    type: String,
    description: 'Start listing after this key',
    example: 'documents/file-5.pdf',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1, default: 1 })
  @ApiResponse({
    status: 200,
    description: 'Files listed successfully',
    type: ListFilesResponseDto,
  })
  async listFiles(@Query() query: ListFilesDto): Promise<AppApiResponse<ListFilesResponseDto>> {
    this.logger.log(`Listing files with prefix: ${query.prefix || 'none'}`);
    const result = await this.storageService.listFiles({
      prefix: query.prefix,
      limit: query.limit,
      startAfter: query.startAfter,
      page: query.page,
    });
    const response: ListFilesResponseDto = {
      files: result.files.map((file) => this.toFileMetadataDto(file)),
      nextToken: result.nextToken,
    };
    this.logger.log(`Listed ${result.files.length} files`);
    return { success: true, data: response };
  }

  @Get('file/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiParam({ name: 'key', type: String, description: 'File key (path)', example: 'documents/report.pdf' })
  @ApiQuery({ name: 'bucket', required: false, type: String, description: 'Custom bucket name', example: 'my-bucket' })
  @ApiResponse({
    status: 200,
    description: 'Metadata retrieved successfully',
    type: FileMetadataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file key' })
  async getFileMetadata(@Param() params: GetFileMetadataDto): Promise<AppApiResponse<FileMetadataResponseDto>> {
    this.logger.log(`Getting metadata for file: ${params.key}`);
    const result = await this.storageService.getFileMetadata(params.key, params.bucket);
    this.logger.log(`Metadata retrieved for file: ${params.key}`);
    return { success: true, data: this.toFileMetadataDto(result) };
  }

  @Get('download/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download a file' })
  @ApiParam({ name: 'key', type: String, description: 'File key (path)', example: 'documents/report.pdf' })
  @ApiQuery({ name: 'bucket', required: false, type: String, description: 'Custom bucket name', example: 'my-bucket' })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(@Param() params: GetFileMetadataDto, @Res({ passthrough: false }) res: Response): Promise<void> {
    this.logger.log(`Downloading file: ${params.key}`);
    const result = await this.storageService.downloadFile(params.key, params.bucket);
    res.setHeader('Content-Type', result.metadata.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${params.key}"`);
    res.setHeader('Content-Length', result.metadata.size);
    this.logger.log(`File downloaded successfully: ${params.key}`);
    res.send(result.buffer);
  }

  @Get('presigned/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate presigned URL for temporary file access' })
  @ApiParam({ name: 'key', type: String, description: 'File key (path)', example: 'documents/report.pdf' })
  @ApiQuery({ name: 'bucket', required: false, type: String, description: 'Custom bucket name', example: 'my-bucket' })
  @ApiQuery({
    name: 'expirySeconds',
    required: false,
    type: Number,
    description: 'URL expiry time in seconds',
    example: 7200,
    default: 3600,
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
    type: PresignedUrlResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getPresignedUrl(@Param() params: GetPresignedUrlDto): Promise<AppApiResponse<PresignedUrlResponseDto>> {
    this.logger.log(`Generating presigned URL for: ${params.key}`);
    const url = await this.storageService.getPresignedUrl(params.key, params.bucket, params.expirySeconds);
    const response: PresignedUrlResponseDto = {
      url,
      key: params.key,
      expirySeconds: params.expirySeconds ?? 3600,
    };
    this.logger.log(`Presigned URL generated for: ${params.key}`);
    return { success: true, data: response };
  }

  @Delete('file/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file from storage' })
  @ApiParam({ name: 'key', type: String, description: 'File key (path)', example: 'documents/report.pdf' })
  @ApiQuery({ name: 'bucket', required: false, type: String, description: 'Custom bucket name', example: 'my-bucket' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    type: DeleteFileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param() params: DeleteFileRequestDto): Promise<AppApiResponse<DeleteFileResponseDto>> {
    this.logger.log(`Deleting file: ${params.key}`);
    await this.storageService.deleteFile({
      key: params.key,
      bucket: params.bucket,
    });
    const response: DeleteFileResponseDto = {
      message: `File '${params.key}' deleted successfully`,
    };
    this.logger.log(`File deleted successfully: ${params.key}`);
    return {
      success: true,
      data: response,
    };
  }

  /**
   * Convert file metadata to FileMetadataDto
   */
  private toFileMetadataDto(metadata: {
    key: string;
    size: number;
    mimeType: string;
    uploadDate: Date;
    etag: string;
    bucket: string;
  }): FileMetadataResponseDto {
    return {
      key: metadata.key,
      size: metadata.size,
      mimeType: metadata.mimeType,
      uploadDate: metadata.uploadDate.toISOString(),
      etag: metadata.etag,
      bucket: metadata.bucket,
    };
  }
}
