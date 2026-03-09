import { ApiProperty } from '@nestjs/swagger';

export class ProductRestoreResponseDto {
  @ApiProperty({ description: 'Success message', example: 'Product restored successfully' })
  message: string;
}
