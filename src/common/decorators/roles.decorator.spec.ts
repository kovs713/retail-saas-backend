import { Role } from '../enums';
import { ROLES_KEY, Roles } from './roles.decorator';

import { Reflector } from '@nestjs/core';

describe('Roles Decorator', () => {
  it('should set roles metadata on a handler', () => {
    class TestController {
      @Roles(Role.ADMIN, Role.OWNER)
      testMethod() {}
    }

    const reflector = new Reflector();
    const roles = reflector.get<Role[]>(
      ROLES_KEY,
      TestController.prototype.testMethod,
    );
    expect(roles).toEqual([Role.ADMIN, Role.OWNER]);
  });

  it('should set empty array when no roles provided', () => {
    class TestController {
      @Roles()
      testMethod() {}
    }

    const reflector = new Reflector();
    const roles = reflector.get<Role[]>(
      ROLES_KEY,
      TestController.prototype.testMethod,
    );
    expect(roles).toEqual([]);
  });
});
