import { StorageService } from '@/modules/storage/storage.service';
import { ListFilesDto, UploadFileDto } from './dto';

import { Controller, Delete, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Storage')
@ApiBearerAuth('JWT')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to S3 storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        bucket: { type: 'string', example: 'my-bucket' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded',
    example: {
      success: true,
      data: {
        url: 'http://localhost:9000/bucket/file.pdf',
        key: 'file.pdf',
        metadata: { size: 1024, mimeType: 'application/pdf' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Query() query: UploadFileDto) {
    const result = await this.storageService.uploadFile({ file, bucket: query.bucket });

    return { success: true, data: result };
  }

  @Get('files')
  @ApiOperation({ summary: 'List files in storage' })
  @ApiResponse({
    status: 200,
    description: 'Files listed',
    example: {
      success: true,
      data: {
        files: [{ key: 'file.pdf', size: 1024, mimeType: 'application/pdf' }],
      },
    },
  })
  async listFiles(@Query() query: ListFilesDto) {
    const result = await this.storageService.listFiles({
      prefix: query.prefix,
      limit: query.limit,
      startAfter: query.startAfter,
      page: query.page,
    });

    return { success: true, data: result };
  }

  @Get('file/:key')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiResponse({
    status: 200,
    description: 'Metadata retrieved',
    example: {
      success: true,
      data: { key: 'file.pdf', size: 1024, mimeType: 'application/pdf' },
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileMetadata(@Param('key') key: string, @Query('bucket') bucket?: string) {
    const result = await this.storageService.getFileMetadata(key, bucket);

    return { success: true, data: result };
  }

  @Get('download/:key')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({ status: 200, description: 'File downloaded' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('key') key: string,
    @Query('bucket') bucket: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ) {
    const result = await this.storageService.downloadFile(key, bucket);
    res.setHeader('Content-Type', result.metadata.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${key}"`);
    res.setHeader('Content-Length', result.metadata.size);

    return res.send(result.buffer);
  }

  @Get('presigned/:key')
  @ApiOperation({ summary: 'Generate presigned URL' })
  @ApiResponse({
    status: 200,
    description: 'URL generated',
    example: {
      success: true,
      data: {
        url: 'http://localhost:9000/bucket/file.pdf?token=abc',
        expirySeconds: 3600,
      },
    },
  })
  async getPresignedUrl(
    @Param('key') key: string,
    @Query('bucket') bucket: string | undefined,
    @Query('expirySeconds') expirySeconds: string | undefined,
  ) {
    const expiry = expirySeconds ? parseInt(expirySeconds, 10) : 3600;
    const url = await this.storageService.getPresignedUrl(key, bucket, expiry);

    return { success: true, data: { url, key, expirySeconds: expiry } };
  }

  @Delete('file/:key')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('key') key: string, @Query('bucket') bucket?: string) {
    await this.storageService.deleteFile({ key, bucket });

    return { success: true, message: `File '${key}' deleted successfully` };
  }
}
