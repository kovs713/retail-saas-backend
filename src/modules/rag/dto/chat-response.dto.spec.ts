import { ChatResponseDto } from './chat-response.dto';
import { SourceDto } from './source.dto';

describe('ChatResponseDto', () => {
  const mockSources: SourceDto[] = [
    { content: 'Source 1 content', metadata: { source: 'doc1' } },
    { content: 'Source 2 content', metadata: { source: 'doc2' } },
  ];

  it('should create valid DTO with all fields', () => {
    const dto: ChatResponseDto = {
      answer: 'This is the AI answer',
      sources: mockSources,
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.answer).toBe('This is the AI answer');
    expect(dto.sources).toHaveLength(2);
    expect(dto.timestamp).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should handle empty sources', () => {
    const dto: ChatResponseDto = {
      answer: 'No sources available',
      sources: [],
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.sources).toHaveLength(0);
  });

  it('should handle single source', () => {
    const dto: ChatResponseDto = {
      answer: 'Answer from one source',
      sources: [mockSources[0]],
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.sources).toHaveLength(1);
  });
});
