import { AppLogger } from '@/common/logger/app-logger.service';
import { MinioClient } from '@/common/types/providers.type';
import { StorageService } from '@/modules/storage';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Client } from 'minio';
import type { BucketStream, ObjectInfo } from 'minio';
import { Readable } from 'stream';

/* eslint-disable @typescript-eslint/unbound-method */
jest.mock('@/common/logger/app-logger.service', () => ({
  AppLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('StorageService', () => {
  let service: StorageService;
  let mockMinioClient: jest.Mocked<Client>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockBucket = 'test-bucket';
  const mockKey = 'test-file.txt';
  const mockFileBuffer = Buffer.from('test content');

  beforeEach(async () => {
    mockMinioClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      getObject: jest.fn(),
      removeObject: jest.fn(),
      listObjects: jest.fn(),
      statObject: jest.fn(),
      presignedGetObject: jest.fn(),
    } as unknown as jest.Mocked<Client>;

    mockConfigService = {
      getOrThrow: jest.fn(<T extends string>(key: string): T => {
        const config: Record<string, string> = {
          S3_BUCKET: mockBucket,
          S3_REGION: 'us-east-1',
        };
        return config[key] as T;
      }),
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: MinioClient, useValue: mockMinioClient },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AppLogger, useValue: { log: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const mockFile = {
      originalname: mockKey,
      buffer: mockFileBuffer,
      mimetype: 'text/plain',
      size: mockFileBuffer.length,
    } as Express.Multer.File;

    it('should upload file successfully', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue();
      mockMinioClient.statObject.mockResolvedValue({
        size: mockFileBuffer.length,
        lastModified: new Date(),
        metaData: { 'content-type': 'text/plain' },
        etag: 'test-etag',
      } as import('minio').BucketItemStat);
      mockMinioClient.presignedGetObject.mockResolvedValue('http://test-bucket.localhost/test-file.txt');

      const result = await service.uploadFile({ file: mockFile });

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith(mockBucket);
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        mockBucket,
        mockKey,
        mockFileBuffer,
        mockFileBuffer.length,
        { 'content-type': 'text/plain' },
      );
      expect(result).toEqual({
        url: 'http://test-bucket.localhost/test-file.txt',
        key: mockKey,
        metadata: expect.objectContaining({
          key: mockKey,
          size: mockFileBuffer.length,
          mimeType: 'text/plain',
        }) as unknown,
      });
    });

    it('should create bucket if not exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue();
      mockMinioClient.putObject.mockResolvedValue();
      mockMinioClient.statObject.mockResolvedValue({
        size: mockFileBuffer.length,
        lastModified: new Date(),
        metaData: { 'content-type': 'text/plain' },
        etag: 'test-etag',
      } as import('minio').BucketItemStat);
      mockMinioClient.presignedGetObject.mockResolvedValue('http://test-bucket.localhost/test-file.txt');

      await service.uploadFile({ file: mockFile });
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith(mockBucket, 'us-east-1');
    });

    it('should use custom bucket when provided', async () => {
      const customBucket = 'custom-bucket';
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue();
      mockMinioClient.statObject.mockResolvedValue({
        size: mockFileBuffer.length,
        lastModified: new Date(),
        metaData: { 'content-type': 'text/plain' },
        etag: 'test-etag',
      } as import('minio').BucketItemStat);
      mockMinioClient.presignedGetObject.mockResolvedValue('http://custom-bucket.localhost/test-file.txt');

      await service.uploadFile({ file: mockFile, bucket: customBucket });
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith(customBucket);
    });

    it('should throw error when upload fails', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockRejectedValue(new Error('Upload failed'));
      await expect(service.uploadFile({ file: mockFile })).rejects.toThrow('Upload failed');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockStream = new Readable({
        read() {
          this.push(mockFileBuffer);
          this.push(null);
        },
      });
      mockMinioClient.statObject.mockResolvedValue({
        size: mockFileBuffer.length,
        lastModified: new Date(),
        metaData: { 'content-type': 'text/plain' },
        etag: 'test-etag',
      } as import('minio').BucketItemStat);
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const result = await service.downloadFile(mockKey);

      expect(mockMinioClient.statObject).toHaveBeenCalledWith(mockBucket, mockKey);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(mockBucket, mockKey);
      expect(result.buffer).toEqual(mockFileBuffer);
      expect(result.metadata).toEqual(expect.objectContaining({ key: mockKey, size: mockFileBuffer.length }));
    });

    it('should throw error when file not found', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('File not found'));
      await expect(service.downloadFile(mockKey)).rejects.toThrow('File not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockMinioClient.removeObject.mockResolvedValue();
      await service.deleteFile({ key: mockKey });
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(mockBucket, mockKey);
    });

    it('should throw error when delete fails', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('Delete failed'));
      await expect(service.deleteFile({ key: mockKey })).rejects.toThrow('Delete failed');
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const mockObjects = [
        {
          name: 'file1.txt',
          size: 100,
          lastModified: new Date(),
          contentType: 'text/plain',
          etag: 'etag1',
        },
      ];
      let iterationIndex = 0;
      const mockIterator: BucketStream<ObjectInfo> = {
        [Symbol.asyncIterator]: function (this: BucketStream<ObjectInfo>) {
          return this;
        },
        next: (): Promise<
          IteratorResult<{
            name: string;
            size: number;
            lastModified: Date;
            contentType: string;
            etag: string;
          }>
        > => {
          return new Promise((resolve) => {
            if (iterationIndex < mockObjects.length) {
              resolve({
                value: mockObjects[iterationIndex++],
                done: false,
              });
            } else {
              resolve({ done: true, value: undefined });
            }
          });
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockMinioClient.listObjects.mockReturnValue(mockIterator);

      const result = await service.listFiles({ prefix: 'test/' });

      expect(mockMinioClient.listObjects).toHaveBeenCalledWith(mockBucket, 'test/', true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual(expect.objectContaining({ key: 'file1.txt', size: 100 }));
    });

    it('should return empty list when no files', async () => {
      const mockEmptyIterator: BucketStream<ObjectInfo> = {
        [Symbol.asyncIterator]: function (this: BucketStream<ObjectInfo>) {
          return this;
        },
        next: (): Promise<
          IteratorResult<{
            name: string;
            size: number;
            lastModified: Date;
            contentType: string;
            etag: string;
          }>
        > => Promise.resolve({ done: true, value: undefined }),
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockMinioClient.listObjects.mockReturnValue(mockEmptyIterator);
      const result = await service.listFiles({});
      expect(result.files).toHaveLength(0);
      expect(result.nextToken).toBeUndefined();
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata successfully', async () => {
      const mockStat = {
        size: mockFileBuffer.length,
        lastModified: new Date('2024-01-01'),
        metaData: { 'content-type': 'text/plain' },
        etag: 'test-etag',
      } as import('minio').BucketItemStat;
      mockMinioClient.statObject.mockResolvedValue(mockStat);

      const result = await service.getFileMetadata(mockKey);

      expect(mockMinioClient.statObject).toHaveBeenCalledWith(mockBucket, mockKey);
      expect(result).toEqual({
        key: mockKey,
        size: mockFileBuffer.length,
        mimeType: 'text/plain',
        uploadDate: new Date('2024-01-01'),
        etag: 'test-etag',
        bucket: mockBucket,
      });
    });

    it('should use default mime type when not available', async () => {
      mockMinioClient.statObject.mockResolvedValue({
        size: mockFileBuffer.length,
        lastModified: new Date(),
        metaData: {},
        etag: 'test-etag',
      } as import('minio').BucketItemStat);
      const result = await service.getFileMetadata(mockKey);
      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('should throw error when file not found', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('File not found'));
      await expect(service.getFileMetadata(mockKey)).rejects.toThrow('File not found');
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL successfully', async () => {
      const mockUrl = 'http://test-bucket.localhost/test-file.txt?token=abc';
      mockMinioClient.presignedGetObject.mockResolvedValue(mockUrl);
      const result = await service.getPresignedUrl(mockKey);
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(mockBucket, mockKey, 3600);
      expect(result).toBe(mockUrl);
    });

    it('should use custom expiry when provided', async () => {
      const mockUrl = 'http://test-bucket.localhost/test-file.txt?token=abc';
      mockMinioClient.presignedGetObject.mockResolvedValue(mockUrl);
      await service.getPresignedUrl(mockKey, undefined, 7200);
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(mockBucket, mockKey, 7200);
    });

    it('should throw error when URL generation fails', async () => {
      mockMinioClient.presignedGetObject.mockRejectedValue(new Error('URL generation failed'));
      await expect(service.getPresignedUrl(mockKey)).rejects.toThrow('URL generation failed');
    });
  });
});
