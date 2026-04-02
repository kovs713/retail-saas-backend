import { TokenPayload } from '../types';
import { userFactory } from './user.decorator';

import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';

describe('User Decorator', () => {
  const mockUser: TokenPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'owner',
    shopId: 'shop-1',
  };

  const buildContext = (user: TokenPayload = mockUser): ExecutionContext => {
    const mockRequest = { user } as never;
    return createMock<ExecutionContext>({
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    });
  };

  it('should extract user from request context', () => {
    const ctx = buildContext();
    const result = userFactory(undefined, ctx);

    expect(result).toEqual(mockUser);
  });

  it('should return user with all properties', () => {
    const ctx = buildContext();
    const result = userFactory(undefined, ctx);

    expect(result.sub).toBe('user-123');
    expect(result.email).toBe('test@example.com');
    expect(result.role).toBe('owner');
    expect(result.shopId).toBe('shop-1');
  });

  it('should handle different roles', () => {
    const admin: TokenPayload = { sub: 'admin-1', email: 'a@b.c', role: 'admin', shopId: 'shop-1' };
    const ctx = buildContext(admin);
    const result = userFactory(undefined, ctx);

    expect(result.role).toBe('admin');
  });

  it('should call switchToHttp and getRequest', () => {
    const getRequest = jest.fn().mockReturnValue({ user: mockUser });
    const switchToHttp = jest.fn().mockReturnValue({ getRequest });
    const ctx = createMock<ExecutionContext>({ switchToHttp });

    userFactory(undefined, ctx);

    expect(switchToHttp).toHaveBeenCalled();
    expect(getRequest).toHaveBeenCalled();
  });
});
