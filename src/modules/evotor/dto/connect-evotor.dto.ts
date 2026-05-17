import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

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

export class SyncEvotorDto {
  @ApiProperty({
    description: 'Evotor user id to sync through bridge',
    example: '01-000000000000001',
  })
  @IsNotEmpty()
  @IsString()
  evotor_user_id: string;

  @ApiProperty({
    description: 'Documents sync start date',
    example: '2026-05-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Documents sync end date',
    example: '2026-05-16',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
