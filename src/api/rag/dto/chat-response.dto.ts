import { SourceDto } from './source.dto';

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class ChatResponseDto {
  @ApiProperty({ description: 'AI answer' })
  @IsString()
  answer: string;

  @ApiProperty({ description: 'Source documents', type: [SourceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceDto)
  sources: SourceDto[];

  @ApiProperty({ description: 'Response timestamp' })
  @IsString()
  timestamp: string;
}
