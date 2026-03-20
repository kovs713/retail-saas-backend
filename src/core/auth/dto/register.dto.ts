import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

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
  @ValidateNested()
  shopWorkingHours?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
