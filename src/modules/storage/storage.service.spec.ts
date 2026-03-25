import { MinioClient } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { StorageService } from './storage.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { BucketItem, BucketItemStat, Client } from 'minio';

describe('StorageService', () => {
  let service: StorageService;
  let mockMinioClient: DeepMocked<Client>;
  let mockConfigService: DeepMocked<ConfigService>;

  function asBucketStream(objects: BucketItem[]): ReturnType<Client['listObjects']> {
    return (function* () {
      for (const obj of objects) yield obj;
    })() as unknown as ReturnType<Client['listObjects']>;
  }

  const mockBucket = 'test-bucket';
  const mockKey = 'test-file.txt';
  const mockFileBuffer = Buffer.from('test content');
  const mockUploadedInfo = {
    etag: 'test-etag',
    versionId: null,
  };
  const mockStat: BucketItemStat = {
    size: mockFileBuffer.length,
    lastModified: new Date(),
    metaData: { 'content-type': 'text/plain' },
    etag: 'test-etag',
  };

  beforeEach(async () => {
    mockMinioClient = createMock<Client>();
    mockMinioClient.statObject.mockResolvedValue(mockStat);

    mockConfigService = createMock<ConfigService>();
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        S3_BUCKET: mockBucket,
        S3_REGION: 'us-east-1',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: MinioClient,
          useValue: mockMinioClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    mockMinioClient = module.get<DeepMocked<Client>>(MinioClient);
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
      mockMinioClient.putObject.mockResolvedValue(mockUploadedInfo);
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
        }),
      });
    });

    it('should create bucket if not exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue();
      mockMinioClient.putObject.mockResolvedValue(mockUploadedInfo);
      mockMinioClient.presignedGetObject.mockResolvedValue('http://test-bucket.localhost/test-file.txt');

      await service.uploadFile({ file: mockFile });
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith(mockBucket, 'us-east-1');
    });

    it('should use custom bucket when provided', async () => {
      const customBucket = 'custom-bucket';
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue(mockUploadedInfo);
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
      const mockObjects: BucketItem[] = [{ name: 'file1.txt', size: 100, lastModified: new Date(), etag: 'etag1' }];
      mockMinioClient.listObjects.mockReturnValue(asBucketStream(mockObjects));

      const result = await service.listFiles({ prefix: 'test/' });

      expect(mockMinioClient.listObjects).toHaveBeenCalledWith(mockBucket, 'test/', true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toEqual(expect.objectContaining({ key: 'file1.txt', size: 100 }));
    });

    it('should return empty list when no files', async () => {
      mockMinioClient.listObjects.mockReturnValue(asBucketStream([]));

      const result = await service.listFiles({});

      expect(result.files).toHaveLength(0);
      expect(result.nextToken).toBeUndefined();
    });

    it('should set nextToken to last file key when multiple files exist', async () => {
      const mockObjects: BucketItem[] = [
        { name: 'file1.txt', size: 100, lastModified: new Date(), etag: 'etag1' },
        { name: 'file2.txt', size: 200, lastModified: new Date(), etag: 'etag2' },
      ];
      mockMinioClient.listObjects.mockReturnValue(asBucketStream(mockObjects));

      const result = await service.listFiles({});

      expect(result.files).toHaveLength(2);
      expect(result.nextToken).toBe('file2.txt');
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata successfully', async () => {
      mockMinioClient.statObject.mockResolvedValue({
        size: mockFileBuffer.length,
        lastModified: new Date('2024-01-01'),
        metaData: { 'content-type': 'text/plain' },
        etag: 'test-etag',
      } as BucketItemStat);

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
      } as BucketItemStat);

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

  describe('getPresignedPutUrl', () => {
    it('should generate presigned PUT URL successfully', async () => {
      const mockUrl = 'http://test-bucket.localhost/test-file.txt?token=abc';
      mockMinioClient.presignedPutObject.mockResolvedValue(mockUrl);

      const result = await service.getPresignedPutUrl(mockKey);

      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(mockBucket, mockKey, 3600);
      expect(result).toBe(mockUrl);
    });

    it('should use custom expiry when provided', async () => {
      const mockUrl = 'http://test-bucket.localhost/test-file.txt?token=abc';
      mockMinioClient.presignedPutObject.mockResolvedValue(mockUrl);

      await service.getPresignedPutUrl(mockKey, undefined, 7200);

      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(mockBucket, mockKey, 7200);
    });

    it('should throw error when URL generation fails', async () => {
      mockMinioClient.presignedPutObject.mockRejectedValue(new Error('URL generation failed'));
      await expect(service.getPresignedPutUrl(mockKey)).rejects.toThrow('URL generation failed');
    });
  });
});
