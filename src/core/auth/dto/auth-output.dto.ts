import { IsEmail, IsString } from 'class-validator';

export class AuthOutputDto {
  @IsEmail()
  email: string;

  @IsString()
  accessToken: string;
}
