import { UserInfoDto } from './user-info.dto';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class AuthResponseDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  email: string;

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
