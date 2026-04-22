import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Корма' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Category slug (URL-friendly)',
    example: 'korma',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  slug: string;
}
