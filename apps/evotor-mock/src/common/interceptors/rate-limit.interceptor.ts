import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<{
      setHeader: (name: string, value: string) => void;
    }>();

    response.setHeader('X-RateLimit-Limit', '1000');
    response.setHeader('X-RateLimit-Remaining', '999');
    response.setHeader('X-RateLimit-Reset', '60');

    return next.handle();
  }
}
