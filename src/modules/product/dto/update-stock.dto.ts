import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ description: 'New stock quantity', example: 150 })
  @IsNumber()
  @Min(0)
  quantity: number;
}
