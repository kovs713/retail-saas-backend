import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Express } from 'express';

export class UploadFileDto {
  @ApiProperty({
    description: 'File to upload',
    type: 'string',
    format: 'binary',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  file: Express.Multer.File;

  @ApiPropertyOptional({ description: 'Bucket name' })
  @IsOptional()
  @IsString()
  bucket?: string;
}

export class FileMetadataDto {
  @ApiProperty() key: string;
  @ApiProperty() size: number;
  @ApiProperty() mimeType: string;
  @ApiProperty() uploadDate: Date;
  @ApiProperty() etag: string;
  @ApiProperty() bucket: string;
}

export class UploadFileResponseDto {
  @ApiProperty() url: string;
  @ApiProperty() key: string;
  @ApiProperty({ type: FileMetadataDto }) metadata: FileMetadataDto;
}

export class ListFilesDto {
  @ApiPropertyOptional() @IsOptional() @IsString() prefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() startAfter?: string;
}

export class FileItemDto {
  @ApiProperty() key: string;
  @ApiProperty() size: number;
  @ApiProperty() mimeType: string;
  @ApiProperty() uploadDate: Date;
  @ApiProperty() etag: string;
  @ApiProperty() bucket: string;
}

export class ListFilesResponseDto {
  @ApiProperty({ type: [FileItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileItemDto)
  files: FileItemDto[];

  @ApiPropertyOptional() nextToken?: string;
}

export class DeleteFileRequestDto {
  @ApiProperty() @IsString() key: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bucket?: string;
}

export class GetFileMetadataRequestDto {
  @ApiProperty() @IsString() key: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bucket?: string;
}
