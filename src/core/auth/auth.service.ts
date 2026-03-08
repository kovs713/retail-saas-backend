import { AuthOutputDto } from './dto/auth-output.dto';
import { SignInDto } from './dto/sign-in.dto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async signIn(signInDto: SignInDto): Promise<AuthOutputDto> {
    const tokenPayload = {
      sub: signInDto.id,
      email: signInDto.email,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      email: signInDto.email,
      accessToken: accessToken,
    };
  }
}
