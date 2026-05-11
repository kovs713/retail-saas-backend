import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ description: 'Location name', example: 'Main Branch' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Location address',
    example: '123 Main St',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Location phone',
    example: '+1234567890',
  })
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
    description: 'Set as default location',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
