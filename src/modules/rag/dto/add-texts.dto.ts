import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class AddTextsDto {
  @ApiProperty({ description: 'Texts to add', type: [String] })
  @IsArray()
  @IsString({ each: true })
  texts: string[];

  @ApiPropertyOptional({ description: 'Metadata', type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  metadata?: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Custom IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}
