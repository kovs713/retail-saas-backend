import { Logger } from '@nestjs/common';

// Suppress NestJS logger during tests to reduce noise
beforeAll(() => {
  Logger.overrideLogger(false);
});

// Restore logger after all tests
afterAll(() => {
  Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);
});
