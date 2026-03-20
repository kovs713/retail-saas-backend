import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Category slug', example: 'electronics' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name', example: 'Electronics' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Category slug', example: 'electronics' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;
}
