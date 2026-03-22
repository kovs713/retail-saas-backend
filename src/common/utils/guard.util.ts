import { Request, TokenPayload } from '../types';

import { createMock } from '@golevelup/ts-jest';
import { CanActivate, ExecutionContext } from '@nestjs/common';

export const mockGuard = (allow = true): CanActivate => {
  const guard = createMock<CanActivate>();
  guard.canActivate.mockResolvedValue(allow);
  return guard;
};

export const mockAuthGuard = (user: TokenPayload): CanActivate => ({
  canActivate: (context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest<Request>();
    req.user = user;
    return true;
  },
});
