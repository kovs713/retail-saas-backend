import { IsEmail, IsUUID } from 'class-validator';

export class SignInDto {
  @IsUUID()
  id: string;

  @IsEmail()
  email: string;

  @IsUUID()
  organizationId: string;
}
