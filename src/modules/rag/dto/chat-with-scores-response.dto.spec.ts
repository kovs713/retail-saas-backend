import { ChatWithScoresResponseDto } from './chat-with-scores-response.dto';
import { DocumentWithScoreDto } from './document-with-score.dto';

describe('ChatWithScoresResponseDto', () => {
  const mockDocumentsWithScore: DocumentWithScoreDto[] = [
    {
      document: { content: 'Document 1', metadata: { source: 'doc1' } },
      score: 0.95,
    },
    {
      document: { content: 'Document 2', metadata: { source: 'doc2' } },
      score: 0.87,
    },
  ];

  it('should create valid DTO with all fields', () => {
    const dto: ChatWithScoresResponseDto = {
      answer: 'AI answer with scores',
      sources: mockDocumentsWithScore,
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.answer).toBe('AI answer with scores');
    expect(dto.sources).toHaveLength(2);
    expect(dto.sources[0].score).toBe(0.95);
    expect(dto.timestamp).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should handle empty sources', () => {
    const dto: ChatWithScoresResponseDto = {
      answer: 'No sources',
      sources: [],
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.sources).toHaveLength(0);
  });

  it('should handle varying scores', () => {
    const dto: ChatWithScoresResponseDto = {
      answer: 'Answer',
      sources: [
        { document: { content: 'Doc', metadata: {} }, score: 0.5 },
        { document: { content: 'Doc2', metadata: {} }, score: 1.0 },
      ],
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.sources[0].score).toBe(0.5);
    expect(dto.sources[1].score).toBe(1.0);
  });
});
