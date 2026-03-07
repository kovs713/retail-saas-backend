import { DocumentWithScoreDto } from './document-with-score.dto';

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class ChatWithScoresResponseDto {
  @ApiProperty({ description: 'AI answer' })
  @IsString()
  answer: string;

  @ApiProperty({
    description: 'Sources with scores',
    type: [DocumentWithScoreDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentWithScoreDto)
  sources: DocumentWithScoreDto[];

  @ApiProperty({ description: 'Response timestamp' })
  @IsString()
  timestamp: string;
}
