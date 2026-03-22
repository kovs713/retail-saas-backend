import { AddTextsResponseDto } from './add-texts-response.dto';

describe('AddTextsResponseDto', () => {
  it('should create valid DTO with all fields', () => {
    const dto: AddTextsResponseDto = {
      textIds: ['text-1', 'text-2'],
      count: 2,
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.textIds).toHaveLength(2);
    expect(dto.count).toBe(2);
    expect(dto.timestamp).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should handle empty text list', () => {
    const dto: AddTextsResponseDto = {
      textIds: [],
      count: 0,
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.textIds).toHaveLength(0);
    expect(dto.count).toBe(0);
  });

  it('should handle single text', () => {
    const dto: AddTextsResponseDto = {
      textIds: ['text-1'],
      count: 1,
      timestamp: '2024-01-15T10:30:00.000Z',
    };

    expect(dto.textIds).toHaveLength(1);
    expect(dto.count).toBe(1);
  });
});
