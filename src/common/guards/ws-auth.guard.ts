import { JwtOptions, JwtConfig, TenantContext, TokenPayload } from '@/common/types';
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(JwtConfig) private readonly jwtConfig: JwtOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.jwtConfig.secret,
      });

      if (!payload.shopId) {
        throw new WsException('Missing tenant context');
      }

      client.data.user = payload;
      client.data.tenantContext = { shopId: payload.shopId } as TenantContext;
      return true;
    } catch (error) {
      if (error instanceof WsException) throw error;
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!auth) return null;

    if (typeof auth === 'string') {
      const [type, token] = auth.split(' ');
      return type === 'Bearer' ? token : auth;
    }

    return null;
  }
}
