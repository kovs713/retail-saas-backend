import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class AddTextsResponseDto {
  @ApiProperty({ description: 'Text IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  textIds: string[];

  @ApiProperty({ description: 'Count' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}
