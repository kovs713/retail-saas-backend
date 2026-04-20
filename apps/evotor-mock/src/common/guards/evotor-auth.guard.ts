import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class EvotorAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const header = request.headers['x-authorization'];
    const token = process.env.MOCK_EVOTOR_TOKEN ?? 'mock-evotor-token';

    if (header !== `Bearer ${token}`) {
      throw new UnauthorizedException('Missing or invalid X-Authorization header');
    }

    return true;
  }
}
