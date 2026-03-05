import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({
    description: 'Stock adjustment (positive to add, negative to remove)',
    example: 50,
  })
  @IsNumber()
  adjustment: number;
}
