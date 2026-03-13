import { Request } from '@/core/auth/types/request.type';

import { ExecutionContext } from '@nestjs/common';

export function createMockAuthGuard() {
  return {
    canActivate: (context: ExecutionContext) => {
      const req: Request = context.switchToHttp().getRequest();
      req.user = { ...req.user, organizationId: 'test-org-id' };
      return true;
    },
  };
}
