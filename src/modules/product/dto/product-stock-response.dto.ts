import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';

export class ProductStockResponseDto {
  @ApiProperty({ description: 'Success message', example: 'Stock updated successfully' })
  message: string;

  @ApiProperty({ description: 'Updated product', type: ProductResponseDto })
  data: ProductResponseDto;
}
