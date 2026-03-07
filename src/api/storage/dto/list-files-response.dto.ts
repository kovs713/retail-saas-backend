import { FileItemDto } from './file-item.dto';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

export class ListFilesResponseDto {
  @ApiProperty({ type: [FileItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileItemDto)
  files: FileItemDto[];

  @ApiPropertyOptional() nextToken?: string;
}
