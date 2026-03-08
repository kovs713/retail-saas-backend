import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

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
