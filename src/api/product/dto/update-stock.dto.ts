import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ description: 'New stock quantity', example: 150 })
  @IsNumber()
  @Min(0)
  quantity: number;
}
