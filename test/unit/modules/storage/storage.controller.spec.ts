import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { StorageController } from '@/api/storage/storage.controller';
import { StorageService } from '@/modules/storage';

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

describe('StorageController', () => {
  let controller: StorageController;
  let storageService: jest.Mocked<StorageService>;

  const mockBucket = 'test-bucket';
  const mockKey = 'test-file.txt';
  const mockFileBuffer = Buffer.from('test content');

  beforeEach(async () => {
    storageService = {
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn(),
      getFileMetadata: jest.fn(),
      getPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: storageService }],
    }).compile();

    controller = module.get<StorageController>(StorageController);
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
      const mockResponse = {
        url: 'http://test-bucket.localhost/test-file.txt',
        key: mockKey,
        metadata: {
          size: mockFileBuffer.length,
          mimeType: 'text/plain',
          uploadDate: new Date(),
          etag: 'test-etag',
          bucket: mockBucket,
        },
      };
      storageService.uploadFile.mockResolvedValue(mockResponse);
      const result = await controller.uploadFile(mockFile, { bucket: undefined } as any);
      expect(storageService.uploadFile).toHaveBeenCalledWith({
        file: mockFile,
        bucket: undefined,
      });
      expect(result).toEqual({ success: true, data: mockResponse });
    });

    it('should upload file with custom bucket', async () => {
      const customBucket = 'custom-bucket';
      const mockResponse = {
        url: `http://${customBucket}.localhost/test-file.txt`,
        key: mockKey,
        metadata: {
          size: mockFileBuffer.length,
          mimeType: 'text/plain',
          uploadDate: new Date(),
          etag: 'test-etag',
          bucket: customBucket,
        },
      };
      storageService.uploadFile.mockResolvedValue(mockResponse);
      await controller.uploadFile(mockFile, { bucket: customBucket } as any);
      expect(storageService.uploadFile).toHaveBeenCalledWith({
        file: mockFile,
        bucket: customBucket,
      });
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const mockResponse = {
        files: [
          {
            key: 'file1.txt',
            size: 100,
            mimeType: 'text/plain',
            uploadDate: new Date(),
            etag: 'etag1',
            bucket: mockBucket,
          },
        ],
        nextToken: undefined,
      };
      storageService.listFiles.mockResolvedValue(mockResponse);
      const result = await controller.listFiles({} as any);
      expect(storageService.listFiles).toHaveBeenCalledWith({
        prefix: undefined,
        limit: undefined,
        startAfter: undefined,
        page: undefined,
      });
      expect(result).toEqual({ success: true, data: mockResponse });
    });

    it('should list files with query parameters', async () => {
      const mockResponse = { files: [], nextToken: undefined };
      storageService.listFiles.mockResolvedValue(mockResponse);
      await controller.listFiles({ prefix: 'test/', limit: 50, startAfter: 'file0.txt', page: 1 } as any);
      expect(storageService.listFiles).toHaveBeenCalledWith({
        prefix: 'test/',
        limit: 50,
        startAfter: 'file0.txt',
        page: 1,
      });
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata successfully', async () => {
      const mockMetadata = {
        key: mockKey,
        size: mockFileBuffer.length,
        mimeType: 'text/plain',
        uploadDate: new Date(),
        etag: 'test-etag',
        bucket: mockBucket,
      };
      storageService.getFileMetadata.mockResolvedValue(mockMetadata);
      const result = await controller.getFileMetadata(mockKey);
      expect(storageService.getFileMetadata).toHaveBeenCalledWith(mockKey, undefined);
      expect(result).toEqual({ success: true, data: mockMetadata });
    });

    it('should get file metadata with custom bucket', async () => {
      const customBucket = 'custom-bucket';
      const mockMetadata = {
        key: mockKey,
        size: mockFileBuffer.length,
        mimeType: 'text/plain',
        uploadDate: new Date(),
        etag: 'test-etag',
        bucket: customBucket,
      };
      storageService.getFileMetadata.mockResolvedValue(mockMetadata);
      await controller.getFileMetadata(mockKey, customBucket);
      expect(storageService.getFileMetadata).toHaveBeenCalledWith(mockKey, customBucket);
    });
  });

  describe('downloadFile', () => {
    // Skipped - tested via e2e
    it.skip('should download file - tested via e2e', () => {});
    it.skip('should download file with custom bucket - tested via e2e', () => {});
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL successfully', async () => {
      const mockUrl = 'http://test-bucket.localhost/test-file.txt?token=abc';
      storageService.getPresignedUrl.mockResolvedValue(mockUrl);
      const result = await controller.getPresignedUrl(mockKey, undefined, undefined);
      expect(storageService.getPresignedUrl).toHaveBeenCalledWith(mockKey, undefined, 3600);
      expect(result).toEqual({
        success: true,
        data: { url: mockUrl, key: mockKey, expirySeconds: 3600 },
      });
    });

    it('should generate presigned URL with custom expiry', async () => {
      const mockUrl = 'http://test-bucket.localhost/test-file.txt?token=abc';
      storageService.getPresignedUrl.mockResolvedValue(mockUrl);
      await controller.getPresignedUrl(mockKey, undefined, '7200');
      expect(storageService.getPresignedUrl).toHaveBeenCalledWith(mockKey, undefined, 7200);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      storageService.deleteFile.mockResolvedValue();
      const result = await controller.deleteFile(mockKey);
      expect(storageService.deleteFile).toHaveBeenCalledWith({
        key: mockKey,
        bucket: undefined,
      });
      expect(result).toEqual({
        success: true,
        message: `File '${mockKey}' deleted successfully`,
      });
    });

    it('should delete file with custom bucket', async () => {
      const customBucket = 'custom-bucket';
      storageService.deleteFile.mockResolvedValue();
      await controller.deleteFile(mockKey, customBucket);
      expect(storageService.deleteFile).toHaveBeenCalledWith({
        key: mockKey,
        bucket: customBucket,
      });
    });
  });
});
