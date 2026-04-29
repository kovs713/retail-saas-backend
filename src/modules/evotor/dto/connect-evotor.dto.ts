import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ConnectEvotorDto {
  @ApiProperty({
    description: 'Phone number used to bind Evotor terminals',
    example: '+79990001122',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Terminal IMEI list',
    example: ['111111111111111', '222222222222222'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  imeis: string[];
}
