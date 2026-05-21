import { ProductImageDto } from './product-image.dto';

import { ApiProperty } from '@nestjs/swagger';

export class ProductImageUploadResponseDto {
  @ApiProperty({ description: 'Uploaded image data' })
  image: ProductImageDto;
}
