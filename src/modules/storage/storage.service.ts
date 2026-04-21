import { MinioClient, MinioConfig, MinioOptions } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger: LoggerService = new LoggerService(StorageService.name);
  private readonly bucket: string;

  constructor(
    @Inject(MinioClient)
    private readonly minioClient: Client,
    @Inject(MinioConfig)
    private readonly minioConfig: MinioOptions,
  ) {
    this.bucket = this.minioConfig.bucket;
  }

  async getPresignedPutUrl(key: string, expirySeconds = 3600): Promise<string> {
    try {
      const url = await this.minioClient.presignedPutObject(this.bucket, key, expirySeconds);
      this.logger.log(`Generated presigned PUT URL for: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned PUT URL for: ${key}`, this.stringifyError(error));
      throw error;
    }
  }

  async putObject(
    key: string,
    payload: Buffer | Readable,
    size: number,
    metaData?: Record<string, string>,
  ): Promise<string> {
    try {
      const uploadResult = await this.minioClient.putObject(this.bucket, key, payload, size, metaData);
      this.logger.log(`Uploaded object successfully: ${key}`);
      return typeof uploadResult === 'string' ? uploadResult : uploadResult.etag;
    } catch (error) {
      this.logger.error(`Failed to upload object: ${key}`, this.stringifyError(error));
      throw error;
    }
  }

  async getObjectStream(key: string): Promise<Readable> {
    try {
      return await this.minioClient.getObject(this.bucket, key);
    } catch (error) {
      this.handleNotFound(error, key);
      this.logger.error(`Failed to get object stream for: ${key}`, this.stringifyError(error));
      throw error;
    }
  }

  async statObject(key: string): Promise<{ size: number; contentType: string; lastModified: Date; etag: string }> {
    try {
      const stat = await this.minioClient.statObject(this.bucket, key);

      return {
        size: Number(stat.size),
        contentType: (stat.metaData?.['content-type'] as string) || 'application/octet-stream',
        lastModified: stat.lastModified,
        etag: stat.etag || '',
      };
    } catch (error) {
      this.handleNotFound(error, key);
      this.logger.error(`Failed to get metadata for file: ${key}`, this.stringifyError(error));
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, key);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.handleNotFound(error, key);
      this.logger.error(`Failed to delete file: ${key}`, this.stringifyError(error));
      throw error;
    }
  }

  private handleNotFound(error: unknown, key: string): void {
    const code = this.extractErrorCode(error);
    if (code === 'NotFound' || code === 'NoSuchKey' || code === 'NoSuchObject') {
      throw new NotFoundException(`File not found: ${key}`);
    }
  }

  private extractErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const maybeCode = (error as { code?: unknown }).code;
    return typeof maybeCode === 'string' ? maybeCode : undefined;
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}
