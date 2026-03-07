import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class AddDocumentsResponseDto {
  @ApiProperty({ description: 'Document IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  documentIds: string[];

  @ApiProperty({ description: 'Count' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp: string;
}
