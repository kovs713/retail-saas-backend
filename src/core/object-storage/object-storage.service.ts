import { S3Client, S3Config, S3Options } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client as AwsS3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class ObjectStorageService {
  private readonly logger: LoggerService = new LoggerService(
    ObjectStorageService.name,
  );
  private readonly bucket: string;

  constructor(
    @Inject(S3Client)
    private readonly s3Client: AwsS3Client,
    @Inject(S3Config)
    private readonly s3Config: S3Options,
  ) {
    this.bucket = this.s3Config.bucket;
  }

  async getPresignedPutUrl(key: string, expirySeconds = 3600): Promise<string> {
    try {
      const url = await getSignedUrl(
        this.s3Client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: expirySeconds },
      );
      this.logger.log(`Generated presigned PUT URL for: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned PUT URL for: ${key}`,
        this.stringifyError(error),
      );
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
      const metadataEntries = Object.entries(metaData ?? {}).filter(
        ([name]) =>
          !['content-type', 'cache-control'].includes(name.toLowerCase()),
      );
      const uploadResult = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: payload,
          ContentLength: size,
          ContentType: metaData?.['Content-Type'] ?? metaData?.['content-type'],
          CacheControl:
            metaData?.['Cache-Control'] ?? metaData?.['cache-control'],
          Metadata:
            metadataEntries.length > 0
              ? Object.fromEntries(metadataEntries)
              : undefined,
        }),
      );
      this.logger.log(`Uploaded object successfully: ${key}`);
      return uploadResult.ETag ?? '';
    } catch (error) {
      this.logger.error(
        `Failed to upload object: ${key}`,
        this.stringifyError(error),
      );
      throw error;
    }
  }

  async getObjectStream(key: string): Promise<Readable> {
    try {
      const object = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      if (
        !object.Body ||
        typeof (object.Body as Readable).pipe !== 'function'
      ) {
        throw new Error(`Object body is not readable: ${key}`);
      }

      return object.Body as Readable;
    } catch (error) {
      this.handleNotFound(error, key);
      this.logger.error(
        `Failed to get object stream for: ${key}`,
        this.stringifyError(error),
      );
      throw error;
    }
  }

  async statObject(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
  }> {
    try {
      const stat = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return {
        size: Number(stat.ContentLength ?? 0),
        contentType:
          stat.ContentType ||
          stat.Metadata?.['content-type'] ||
          'application/octet-stream',
        lastModified: stat.LastModified ?? new Date(0),
        etag: stat.ETag ?? '',
      };
    } catch (error) {
      this.handleNotFound(error, key);
      this.logger.error(
        `Failed to get metadata for file: ${key}`,
        this.stringifyError(error),
      );
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.handleNotFound(error, key);
      this.logger.error(
        `Failed to delete file: ${key}`,
        this.stringifyError(error),
      );
      throw error;
    }
  }

  private handleNotFound(error: unknown, key: string): void {
    const code = this.extractErrorCode(error);
    const statusCode = this.extractHttpStatusCode(error);
    if (
      code === 'NotFound' ||
      code === 'NoSuchKey' ||
      code === 'NoSuchObject' ||
      statusCode === 404
    ) {
      throw new NotFoundException(`File not found: ${key}`);
    }
  }

  private extractErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const maybeCode =
      (error as { code?: unknown; Code?: unknown; name?: unknown }).code ??
      (error as { code?: unknown; Code?: unknown; name?: unknown }).Code ??
      (error as { code?: unknown; Code?: unknown; name?: unknown }).name;
    return typeof maybeCode === 'string' ? maybeCode : undefined;
  }

  private extractHttpStatusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const maybeStatusCode = (
      error as { $metadata?: { httpStatusCode?: unknown } }
    ).$metadata?.httpStatusCode;
    return typeof maybeStatusCode === 'number' ? maybeStatusCode : undefined;
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}
