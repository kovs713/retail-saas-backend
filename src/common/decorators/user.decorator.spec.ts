import { Role } from '../enums';
import { TokenPayload } from '../types';
import { userFactory } from './user.decorator';

import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('User Decorator', () => {
  const mockUser: TokenPayload = {
    sub: 'user-id',
    email: 'test@example.com',
    role: Role.EMPLOYEE,
    shopId: 'shop-id',
  };

  const buildContext = (user: unknown): ExecutionContext =>
    createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    });

  it('should return TokenPayload from request.user', () => {
    const ctx = buildContext(mockUser);
    const result = userFactory(undefined, ctx);
    expect(result).toEqual<TokenPayload>(mockUser);
  });

  it('should throw UnauthorizedException when user is undefined', () => {
    const ctx = buildContext(undefined);
    expect(() => userFactory(undefined, ctx)).toThrow(UnauthorizedException);
  });
});
