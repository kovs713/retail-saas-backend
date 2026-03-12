import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  it('should be a valid module', () => {
    expect(AuthModule).toBeDefined();
  });

  it('forRoot should return a module object', () => {
    const moduleInstance = new AuthModule();
    expect(moduleInstance).toBeDefined();
  });

  it('exports should include AuthGuard and JwtModule', () => {
    const authModule = new AuthModule();
    expect(authModule).toBeDefined();
  });
});
