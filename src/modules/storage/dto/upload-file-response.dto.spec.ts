import { UploadFileResponseDto } from './upload-file-response.dto';
import { FileMetadataDto } from './file-metadata-response.dto';

describe('UploadFileResponseDto', () => {
  const mockMetadata: FileMetadataDto = {
    key: 'documents/report.pdf',
    size: 1048576,
    mimeType: 'application/pdf',
    uploadDate: '2024-01-15T10:30:00.000Z',
    etag: 'abc123',
    bucket: 'my-bucket',
  };

  it('should create valid DTO with all fields', () => {
    const dto: UploadFileResponseDto = {
      url: 'http://localhost:9000/my-bucket/documents/report.pdf',
      key: 'documents/report.pdf',
      metadata: mockMetadata,
    };

    expect(dto.url).toBe('http://localhost:9000/my-bucket/documents/report.pdf');
    expect(dto.key).toBe('documents/report.pdf');
    expect(dto.metadata).toBeDefined();
    expect(dto.metadata.size).toBe(1048576);
  });
});
