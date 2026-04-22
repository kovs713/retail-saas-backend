import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Корма для кошек',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Category slug (URL-friendly)',
    example: 'korma-dlya-koshek',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;
}
