import { FileMetadataDto } from './file-metadata.dto';

import { ApiProperty } from '@nestjs/swagger';

export class UploadFileResponseDto {
  @ApiProperty() url: string;
  @ApiProperty() key: string;
  @ApiProperty({ type: FileMetadataDto }) metadata: FileMetadataDto;
}
