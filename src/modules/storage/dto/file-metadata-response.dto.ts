import { ApiProperty } from '@nestjs/swagger';

export class FileMetadataDto {
  @ApiProperty({
    description: 'File key (path)',
    example: 'documents/report.pdf',
  })
  key: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  size: number;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  uploadDate: string;

  @ApiProperty({
    description: 'File ETag (hash)',
    example: 'abc123def456',
  })
  etag: string;

  @ApiProperty({
    description: 'Bucket name',
    example: 'my-bucket',
  })
  bucket: string;
}

export class FileMetadataResponseDto extends FileMetadataDto {}
