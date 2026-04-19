import { JwtOptions, JwtConfig, Request, TokenPayload } from '../types';

import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(JwtConfig) private readonly jwtConfig: JwtOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    const payload = await this.verifyToken(token);
    request['user'] = payload;
    return true;
  }

  private async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const tokeyPayload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.jwtConfig.secret,
      });
      return tokeyPayload;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractToken(request: Request): string {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (token && type === 'Bearer') {
      return token;
    }

    throw new UnauthorizedException();
  }
}
