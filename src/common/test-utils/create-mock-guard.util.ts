import { ExecutionContext } from '@nestjs/common';

interface MockRequest {
  user: {
    organizationId: string;
  };
}

export function createMockAuthGuard() {
  return {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest<MockRequest>();
      req.user = { organizationId: 'test-org-id' };
      return true;
    },
  };
}
