import { Role } from '../enums';
import { Roles, ROLES_KEY } from './roles.decorator';

describe('Roles Decorator', () => {
  it('should set roles metadata', () => {
    const roles = [Role.OWNER, Role.EMPLOYEE];
    const decorator = Roles(...roles);

    expect(decorator).toBeDefined();

    const mockTarget = {};
    decorator(mockTarget as any);

    expect(Reflect.getMetadata(ROLES_KEY, mockTarget)).toEqual(roles);
  });

  it('should set single role metadata', () => {
    const roles = [Role.SUPER_ADMIN];
    const decorator = Roles(...roles);

    const mockTarget = {};
    decorator(mockTarget as any);

    expect(Reflect.getMetadata(ROLES_KEY, mockTarget)).toEqual(roles);
  });

  it('should override previous roles when applied multiple times', () => {
    const mockTarget = {};

    Roles(Role.OWNER)(mockTarget as any);
    expect(Reflect.getMetadata(ROLES_KEY, mockTarget)).toEqual([Role.OWNER]);

    Roles(Role.EMPLOYEE)(mockTarget as any);
    expect(Reflect.getMetadata(ROLES_KEY, mockTarget)).toEqual([Role.EMPLOYEE]);
  });

  it('should store roles as array', () => {
    const roles = [Role.OWNER, Role.EMPLOYEE, Role.SUPER_ADMIN];
    const mockTarget = {};

    Roles(...roles)(mockTarget as any);

    const metadata = Reflect.getMetadata(ROLES_KEY, mockTarget);
    expect(Array.isArray(metadata)).toBe(true);
    expect(metadata).toHaveLength(3);
    expect(metadata).toContain(Role.OWNER);
    expect(metadata).toContain(Role.EMPLOYEE);
    expect(metadata).toContain(Role.SUPER_ADMIN);
  });
});
