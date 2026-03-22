import { ProductRestoreResponseDto } from './product-restore-response.dto';

describe('ProductRestoreResponseDto', () => {
  it('should create valid DTO with success message', () => {
    const dto: ProductRestoreResponseDto = {
      message: 'Product restored successfully',
    };

    expect(dto.message).toBe('Product restored successfully');
  });

  it('should handle different success messages', () => {
    const dto: ProductRestoreResponseDto = {
      message: 'Product has been restored',
    };

    expect(dto.message).toBe('Product has been restored');
  });
});
