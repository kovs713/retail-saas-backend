import { ApiProperty } from '@nestjs/swagger';

export class ShopMediaPresignedUrlDto {
  @ApiProperty({ description: 'Presigned S3 PUT URL' })
  uploadUrl: string;

  @ApiProperty({ description: 'Public URL for the uploaded object' })
  publicUrl: string;
}
