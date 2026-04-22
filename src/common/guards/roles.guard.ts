import { Role } from '../enums';
import { JwtOptions, JwtConfig, Request } from '../types';

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(JwtConfig) private readonly jwtConfig: JwtOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    const payload: any = await this.verifyToken(token);

    if (!requiredRoles.includes(payload.role as Role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    request.user = payload;
    return true;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.jwtConfig.secret,
      });
    } catch {
      throw new ForbiddenException('Invalid token');
    }
  }

  private extractToken(request: Request): string {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (token && type === 'Bearer') {
      return token;
    }
    throw new ForbiddenException('Missing token');
  }
}
