import { MinioClient } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { StorageService } from './storage.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { BucketItemStat, Client } from 'minio';

describe('StorageService', () => {
  let service: StorageService;
  let mockMinioClient: DeepMocked<Client>;

  const mockBucket = 'test-bucket';
  const mockKey = 'test-file.txt';
  const mockFileBuffer = Buffer.from('test content');
  const mockStat: BucketItemStat = {
    size: mockFileBuffer.length,
    lastModified: new Date(),
    metaData: { 'content-type': 'text/plain' },
    etag: 'test-etag',
  };

  beforeEach(async () => {
    mockMinioClient = createMock<Client>();
    mockMinioClient.statObject.mockResolvedValue(mockStat);

    const mockConfigService = createMock<ConfigService>();
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      const config: Record<string, string> = { S3_BUCKET: mockBucket };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: MinioClient, useValue: mockMinioClient },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPresignedPutUrl', () => {
    it('should generate presigned PUT URL', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('https://example.com/put');

      const result = await service.getPresignedPutUrl(mockKey);

      expect(result).toBe('https://example.com/put');
    });

    it('should use custom expiry', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue('https://example.com/put');

      const result = await service.getPresignedPutUrl(mockKey, 7200);

      expect(result).toBe('https://example.com/put');
    });

    it('should throw when URL generation fails', async () => {
      mockMinioClient.presignedPutObject.mockRejectedValue(new Error('fail'));
      await expect(service.getPresignedPutUrl(mockKey)).rejects.toThrow('fail');
    });
  });

  describe('getObjectStream', () => {
    it('should return stream from minio', async () => {
      const stream = { pipe: jest.fn(), on: jest.fn() } as any;
      mockMinioClient.getObject.mockResolvedValue(stream);

      const result = await service.getObjectStream(mockKey);

      expect(result).toBe(stream);
    });

    it('should map not found errors', async () => {
      mockMinioClient.getObject.mockRejectedValue({ code: 'NoSuchObject' });
      await expect(service.getObjectStream(mockKey)).rejects.toThrow(NotFoundException);
    });
  });

  describe('putObject', () => {
    it('should upload object with metadata', async () => {
      mockMinioClient.putObject.mockResolvedValue('test-etag');

      const result = await service.putObject(mockKey, mockFileBuffer, mockFileBuffer.length, {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      expect(result).toBe('test-etag');
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        mockBucket,
        mockKey,
        mockFileBuffer,
        mockFileBuffer.length,
        {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      );
    });

    it('should throw when upload fails', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('upload failed'));

      await expect(service.putObject(mockKey, mockFileBuffer, mockFileBuffer.length)).rejects.toThrow('upload failed');
    });
  });

  describe('statObject', () => {
    it('should return stat info', async () => {
      const result = await service.statObject(mockKey);

      expect(result.contentType).toBe('text/plain');
      expect(result.size).toBe(mockFileBuffer.length);
      expect(result.lastModified).toBeDefined();
      expect(result.etag).toBe('test-etag');
    });

    it('should use default content type when missing', async () => {
      mockMinioClient.statObject.mockResolvedValue({ ...mockStat, metaData: {} });

      const result = await service.statObject(mockKey);

      expect(result.contentType).toBe('application/octet-stream');
    });

    it('should map not found errors', async () => {
      mockMinioClient.statObject.mockRejectedValue({ code: 'NoSuchKey' });
      await expect(service.statObject(mockKey)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteObject', () => {
    it('should delete object', async () => {
      mockMinioClient.removeObject.mockResolvedValue();

      await service.deleteObject(mockKey);
    });

    it('should map not found errors', async () => {
      mockMinioClient.removeObject.mockRejectedValue({ code: 'NotFound' });
      await expect(service.deleteObject(mockKey)).rejects.toThrow(NotFoundException);
    });
  });

  describe('error handling', () => {
    it('should log error when getObjectStream fails', async () => {
      const mockError = new Error('Network error');
      mockMinioClient.getObject.mockRejectedValue(mockError);

      await expect(service.getObjectStream(mockKey)).rejects.toThrow();
    });

    it('should log error when statObject fails', async () => {
      const mockError = new Error('Access denied');
      mockMinioClient.statObject.mockRejectedValue(mockError);

      await expect(service.statObject(mockKey)).rejects.toThrow();
    });

    it('should log error when deleteObject fails', async () => {
      const mockError = new Error('Permission denied');
      mockMinioClient.removeObject.mockRejectedValue(mockError);

      await expect(service.deleteObject(mockKey)).rejects.toThrow();
    });

    it('should handle non-object errors gracefully', async () => {
      mockMinioClient.getObject.mockRejectedValue('string error');

      await expect(service.getObjectStream(mockKey)).rejects.toBe('string error');
    });

    it('should handle null errors gracefully', async () => {
      mockMinioClient.getObject.mockRejectedValue(null);

      await expect(service.getObjectStream(mockKey)).rejects.toBeNull();
    });
  });
});
