import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetFileMetadataDto {
  @ApiProperty({
    description: 'File key (path)',
    example: 'documents/report.pdf',
  })
  @IsString()
  key: string;

  @ApiPropertyOptional({
    description: 'Custom bucket name',
    example: 'my-bucket',
  })
  @IsOptional()
  @IsString()
  bucket?: string;
}
