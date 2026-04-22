import { RegistrationStatus } from '@/common/enums';

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString } from 'class-validator';

export class RegisterApplicationResponseDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  shopName: string;

  @ApiProperty()
  @IsString()
  shopSlug: string;

  @ApiProperty({ example: RegistrationStatus.PENDING })
  @IsEnum(RegistrationStatus)
  status: RegistrationStatus;
}
