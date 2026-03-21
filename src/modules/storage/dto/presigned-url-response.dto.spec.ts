import { PresignedUrlResponseDto } from './presigned-url-response.dto';

describe('PresignedUrlResponseDto', () => {
  it('should create valid DTO with all fields', () => {
    const dto: PresignedUrlResponseDto = {
      url: 'http://localhost:9000/my-bucket/documents/report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256',
      key: 'documents/report.pdf',
      expirySeconds: 3600,
    };

    expect(dto.url).toContain('http://localhost:9000');
    expect(dto.key).toBe('documents/report.pdf');
    expect(dto.expirySeconds).toBe(3600);
  });

  it('should handle different expiry times', () => {
    const dto: PresignedUrlResponseDto = {
      url: 'http://localhost:9000/my-bucket/file.txt',
      key: 'file.txt',
      expirySeconds: 7200,
    };

    expect(dto.expirySeconds).toBe(7200);
  });
});
