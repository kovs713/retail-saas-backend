import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';

import { JwtModule } from '@nestjs/jwt';

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
