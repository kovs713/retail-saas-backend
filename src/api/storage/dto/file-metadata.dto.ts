import { ApiProperty } from '@nestjs/swagger';

export class FileMetadataDto {
  @ApiProperty() key: string;
  @ApiProperty() size: number;
  @ApiProperty() mimeType: string;
  @ApiProperty() uploadDate: Date;
  @ApiProperty() etag: string;
  @ApiProperty() bucket: string;
}
