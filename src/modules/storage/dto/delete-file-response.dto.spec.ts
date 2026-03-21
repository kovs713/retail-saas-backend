import { DeleteFileResponseDto } from './delete-file-response.dto';

describe('DeleteFileResponseDto', () => {
  it('should create valid DTO with success message', () => {
    const dto: DeleteFileResponseDto = {
      message: "File 'documents/report.pdf' deleted successfully",
    };

    expect(dto.message).toBe("File 'documents/report.pdf' deleted successfully");
  });

  it('should handle different file paths', () => {
    const dto: DeleteFileResponseDto = {
      message: "File 'images/photo.jpg' deleted successfully",
    };

    expect(dto.message).toBe("File 'images/photo.jpg' deleted successfully");
  });
});
