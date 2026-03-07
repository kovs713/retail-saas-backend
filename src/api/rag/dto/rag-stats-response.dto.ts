import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class RagStatsResponseDto {
  @ApiProperty({ description: 'Document count' })
  @IsNumber()
  documentCount: number;

  @ApiProperty({ description: 'Collection name' })
  @IsString()
  collectionName: string;
}
