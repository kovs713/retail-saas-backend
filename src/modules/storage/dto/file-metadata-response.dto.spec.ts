import { FileMetadataDto } from './file-metadata-response.dto';

describe('FileMetadataDto', () => {
  it('should create valid DTO with all fields', () => {
    const dto: FileMetadataDto = {
      key: 'documents/report.pdf',
      size: 1048576,
      mimeType: 'application/pdf',
      uploadDate: '2024-01-15T10:30:00.000Z',
      etag: 'abc123def456',
      bucket: 'my-bucket',
    };

    expect(dto.key).toBe('documents/report.pdf');
    expect(dto.size).toBe(1048576);
    expect(dto.mimeType).toBe('application/pdf');
    expect(dto.uploadDate).toBe('2024-01-15T10:30:00.000Z');
    expect(dto.etag).toBe('abc123def456');
    expect(dto.bucket).toBe('my-bucket');
  });

  it('should handle different file types', () => {
    const dto: FileMetadataDto = {
      key: 'images/photo.jpg',
      size: 2048576,
      mimeType: 'image/jpeg',
      uploadDate: '2024-02-20T15:45:00.000Z',
      etag: 'xyz789',
      bucket: 'images-bucket',
    };

    expect(dto.mimeType).toBe('image/jpeg');
    expect(dto.bucket).toBe('images-bucket');
  });
});
