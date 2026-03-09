import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileMetadataDto } from './file-metadata-response.dto';

export class ListFilesResponseDto {
  @ApiProperty({
    description: 'List of file metadata',
    type: [FileMetadataDto],
  })
  files: FileMetadataDto[];

  @ApiPropertyOptional({
    description: 'Next page token for pagination',
    example: 'documents/file-10.pdf',
  })
  nextToken?: string;
}
