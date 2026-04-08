import { UserInfoDto } from './user-info.dto';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({ description: 'JWT refresh token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({ description: 'User info', type: UserInfoDto })
  @IsObject()
  user: UserInfoDto;
}
