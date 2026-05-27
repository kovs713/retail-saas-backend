import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateShopDto {
  @ApiPropertyOptional({ description: 'Shop name', example: 'My Shop' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Shop slug (URL-friendly)',
    example: 'my-shop',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Shop description',
    example: 'Best shop in town',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Shop address', example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Shop phone', example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Working hours by day',
    example: { monday: '9:00-18:00', tuesday: '9:00-18:00' },
  })
  @IsOptional()
  @IsObject()
  workingHours?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Banner URL',
    example: 'https://example.com/banner.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  bannerUrl?: string | null;

  @ApiPropertyOptional({ description: 'Is shop active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
