import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class AuthOutputDto {
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
}
