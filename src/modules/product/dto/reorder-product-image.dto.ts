import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ReorderProductImageDto {
  @ApiProperty({ description: 'New sort order position', example: 2 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}
