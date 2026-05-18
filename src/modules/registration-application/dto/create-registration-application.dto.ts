import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateRegistrationApplicationDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (min 6 characters)',
    example: 'password123',
  })
  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;

  @ApiProperty({ description: 'Shop name', example: 'My Shop' })
  @IsNotEmpty()
  @IsString()
  shopName: string;

  @ApiProperty({ description: 'Shop slug (URL-friendly)', example: 'my-shop' })
  @IsNotEmpty()
  @IsString()
  shopSlug: string;

  @ApiPropertyOptional({
    description: 'Shop description',
    example: 'Best shop in town',
  })
  @IsOptional()
  @IsString()
  shopDescription?: string;

  @ApiPropertyOptional({ description: 'Shop address', example: '123 Main St' })
  @IsOptional()
  @IsString()
  shopAddress?: string;

  @ApiPropertyOptional({ description: 'Shop phone', example: '+1234567890' })
  @IsOptional()
  @IsString()
  shopPhone?: string;

  @ApiPropertyOptional({
    description: 'Working hours by day',
    example: { monday: '9:00-18:00', tuesday: '9:00-18:00' },
  })
  @IsOptional()
  @IsObject()
  shopWorkingHours?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Is shop active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
