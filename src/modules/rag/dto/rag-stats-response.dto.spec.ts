import { RagStatsResponseDto } from './rag-stats-response.dto';

describe('RagStatsResponseDto', () => {
  it('should create valid DTO with all fields', () => {
    const dto: RagStatsResponseDto = {
      documentCount: 100,
      collectionName: 'test-collection',
    };

    expect(dto.documentCount).toBe(100);
    expect(dto.collectionName).toBe('test-collection');
  });

  it('should handle zero documents', () => {
    const dto: RagStatsResponseDto = {
      documentCount: 0,
      collectionName: 'empty-collection',
    };

    expect(dto.documentCount).toBe(0);
  });

  it('should handle large document counts', () => {
    const dto: RagStatsResponseDto = {
      documentCount: 10000,
      collectionName: 'large-collection',
    };

    expect(dto.documentCount).toBe(10000);
  });
});
