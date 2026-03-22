import { ListFilesResponseDto } from './list-files-response.dto';
import { FileMetadataDto } from './file-metadata-response.dto';

describe('ListFilesResponseDto', () => {
  const mockFiles: FileMetadataDto[] = [
    {
      key: 'documents/report.pdf',
      size: 1048576,
      mimeType: 'application/pdf',
      uploadDate: '2024-01-15T10:30:00.000Z',
      etag: 'abc123',
      bucket: 'my-bucket',
    },
  ];

  it('should create valid DTO with files', () => {
    const dto: ListFilesResponseDto = {
      files: mockFiles,
    };

    expect(dto.files).toHaveLength(1);
    expect(dto.files[0].key).toBe('documents/report.pdf');
  });

  it('should create valid DTO with empty files', () => {
    const dto: ListFilesResponseDto = {
      files: [],
    };

    expect(dto.files).toHaveLength(0);
  });

  it('should create valid DTO with nextToken', () => {
    const dto: ListFilesResponseDto = {
      files: mockFiles,
      nextToken: 'documents/file-10.pdf',
    };

    expect(dto.files).toHaveLength(1);
    expect(dto.nextToken).toBe('documents/file-10.pdf');
  });
});
