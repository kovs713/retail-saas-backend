import { IsEmail, IsOptional, IsString } from 'class-validator';

export class AuthOutputDto {
  @IsEmail()
  email: string;

  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;
}
