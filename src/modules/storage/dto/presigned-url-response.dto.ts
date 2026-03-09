import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL for file access',
    example:
      'http://localhost:9000/my-bucket/documents/report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...',
  })
  url: string;

  @ApiProperty({
    description: 'File key',
    example: 'documents/report.pdf',
  })
  key: string;

  @ApiProperty({
    description: 'URL expiry time in seconds',
    example: 3600,
  })
  expirySeconds: number;
}
