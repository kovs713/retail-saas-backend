import { MinioClient } from '@/common/types/providers.type';
import { AppLogger } from '@/common/logger/app-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';
import {
  DeleteFileRequest,
  DownloadFileResponse,
  FileMetadata,
  ListFilesRequest,
  ListFilesResponse,
  UploadFileRequest,
  UploadFileResponse,
} from './types/storage.types';

@Injectable()
export class StorageService {
  private readonly logger: AppLogger = new AppLogger(StorageService.name);

  constructor(
    @Inject(MinioClient) private readonly minioClient: Client,
    private readonly configService: ConfigService,
  ) {}

  async uploadFile(request: UploadFileRequest): Promise<UploadFileResponse> {
    try {
      const bucket =
        request.bucket || this.configService.getOrThrow('S3_BUCKET');
      const file = request.file;

      await this.ensureBucketExists(bucket);

      await this.minioClient.putObject(
        bucket,
        file.originalname,
        file.buffer,
        file.buffer.length,
        {
          'content-type': file.mimetype,
        },
      );

      const metadata: FileMetadata = await this.getFileMetadata(
        file.originalname,
        bucket,
      );

      const url = await this.minioClient.presignedGetObject(
        bucket,
        file.originalname,
      );

      this.appLogger.log(`File uploaded successfully: ${file.originalname}`);

      return { url, key: file.originalname, metadata };
    } catch (error) {
      this.logger.error('Failed to upload file', error);
      throw error;
    }
  }

  async downloadFile(
    key: string,
    bucket?: string,
  ): Promise<DownloadFileResponse> {
    try {
      const fileBucket = bucket || this.configService.getOrThrow('S3_BUCKET');
      const metadata = await this.getFileMetadata(key, fileBucket);
      const stream = await this.minioClient.getObject(fileBucket, key);
      const buffer = await this.streamToBuffer(stream);

      this.logger.log(`File downloaded successfully: ${key}`);

      return { buffer, metadata };
    } catch (error) {
      this.logger.error(`Failed to download file: ${key}`, error);
      throw error;
    }
  }

  async deleteFile(request: DeleteFileRequest): Promise<void> {
    try {
      const fileBucket =
        request.bucket || this.configService.getOrThrow('S3_BUCKET');
      await this.minioClient.removeObject(fileBucket, request.key);
      this.logger.log(`File deleted successfully: ${request.key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${request.key}`, error);
      throw error;
    }
  }

  async listFiles(request: ListFilesRequest): Promise<ListFilesResponse> {
    try {
      const fileBucket = this.configService.getOrThrow('S3_BUCKET');
      const prefix = request.prefix || '';
      const objects = this.minioClient.listObjects(fileBucket, prefix, true);
      const files: FileMetadata[] = [];

      for await (const obj of objects) {
        if (obj.name) {
          files.push({
            key: obj.name,
            size: obj.size,
            mimeType: obj.contentType || 'application/octet-stream',
            uploadDate: obj.lastModified,
            etag: obj.etag || '',
            bucket: fileBucket,
          });
        }
      }

      this.logger.log(`Listed ${files.length} files in bucket: ${fileBucket}`);

      return {
        files,
        nextToken: files.length > 0 ? files[files.length - 1].key : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to list files', error);
      throw error;
    }
  }

  async getFileMetadata(key: string, bucket?: string): Promise<FileMetadata> {
    try {
      const fileBucket = bucket || this.configService.getOrThrow('S3_BUCKET');
      const stat = await this.minioClient.statObject(fileBucket, key);

      return {
        key,
        size: stat.size,
        mimeType: stat.metaData?.['content-type'] || 'application/octet-stream',
        uploadDate: stat.lastModified,
        etag: stat.etag || '',
        bucket: fileBucket,
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata for file: ${key}`, error);
      throw error;
    }
  }

  private async ensureBucketExists(bucket: string): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucket);
      if (!exists) {
        await this.minioClient.makeBucket(
          bucket,
          this.configService.getOrThrow('S3_REGION') || 'us-east-1',
        );
        this.logger.log(`Created bucket: ${bucket}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${bucket}`, error);
      throw error;
    }
  }

  async getPresignedUrl(
    key: string,
    bucket?: string,
    expirySeconds = 3600,
  ): Promise<string> {
    try {
      const fileBucket = bucket || this.configService.getOrThrow('S3_BUCKET');
      const url = await this.minioClient.presignedGetObject(
        fileBucket,
        key,
        expirySeconds,
      );
      this.logger.log(`Generated presigned URL for: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for: ${key}`, error);
      throw error;
    }
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
