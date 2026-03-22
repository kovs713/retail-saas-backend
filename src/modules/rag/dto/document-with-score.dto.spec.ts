import { DocumentWithScoreDto } from './document-with-score.dto';
import { DocumentDto } from './document.dto';

describe('DocumentWithScoreDto', () => {
  const mockDocument: DocumentDto = {
    content: 'Test document content',
    metadata: { source: 'test' },
  };

  it('should create valid DTO with all fields', () => {
    const dto: DocumentWithScoreDto = {
      document: mockDocument,
      score: 0.95,
    };

    expect(dto.document.content).toBe('Test document content');
    expect(dto.score).toBe(0.95);
  });

  it('should handle different scores', () => {
    const dto: DocumentWithScoreDto = {
      document: mockDocument,
      score: 0.5,
    };

    expect(dto.score).toBe(0.5);
  });

  it('should handle document without metadata', () => {
    const dto: DocumentWithScoreDto = {
      document: { content: 'Simple doc' },
      score: 0.8,
    };

    expect(dto.document.content).toBe('Simple doc');
    expect(dto.document.metadata).toBeUndefined();
  });
});
