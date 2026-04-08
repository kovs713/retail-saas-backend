import { UserInfoDto } from './user-info.dto';

import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ description: 'User info', type: UserInfoDto })
  @IsObject()
  user: UserInfoDto;
}
