import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConnectEvotorDto {
  @ApiProperty({
    description: 'Evotor store UUID',
    example: '20190607-4F3B-40E0-80F0-00155D012500',
  })
  @IsNotEmpty()
  @IsString()
  storeId: string;

  @ApiProperty({
    description: 'Evotor terminal or device UUID',
    example: '20190607-4F3B-40E0-80F0-00155D012501',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'Evotor user UUID',
    example: '20190607-4F3B-40E0-80F0-00155D012502',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
