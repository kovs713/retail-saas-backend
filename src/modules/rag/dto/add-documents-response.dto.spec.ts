import { AddDocumentsResponseDto } from './add-documents-response.dto';

describe('AddDocumentsResponseDto', () => {
  it('should create valid DTO with all fields', () => {
    const dto: AddDocumentsResponseDto = {
      documentIds: ['doc-1', 'doc-2'],
      count: 2,
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.documentIds).toHaveLength(2);
    expect(dto.count).toBe(2);
    expect(dto.timestamp).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should handle empty document list', () => {
    const dto: AddDocumentsResponseDto = {
      documentIds: [],
      count: 0,
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.documentIds).toHaveLength(0);
    expect(dto.count).toBe(0);
  });

  it('should handle single document', () => {
    const dto: AddDocumentsResponseDto = {
      documentIds: ['doc-1'],
      count: 1,
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.documentIds).toHaveLength(1);
    expect(dto.count).toBe(1);
  });
});
