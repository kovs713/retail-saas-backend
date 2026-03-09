import { ApiProperty } from '@nestjs/swagger';
import { FileMetadataDto } from './file-metadata-response.dto';

export class UploadFileResponseDto {
  @ApiProperty({
    description: 'File URL',
    example: 'http://localhost:9000/my-bucket/documents/report.pdf',
  })
  url: string;

  @ApiProperty({
    description: 'File key',
    example: 'documents/report.pdf',
  })
  key: string;

  @ApiProperty({
    description: 'File metadata',
    type: FileMetadataDto,
  })
  metadata: FileMetadataDto;
}
