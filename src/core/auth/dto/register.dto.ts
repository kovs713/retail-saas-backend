import { IsBoolean, IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  shopName: string;

  @IsNotEmpty()
  @IsString()
  shopSlug: string;

  @IsOptional()
  @IsString()
  shopDescription?: string;

  @IsOptional()
  @IsString()
  shopAddress?: string;

  @IsOptional()
  @IsString()
  shopPhone?: string;

  @IsOptional()
  @IsObject()
  shopWorkingHours?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
