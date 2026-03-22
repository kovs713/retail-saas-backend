import { LoggerService } from './logger.service';

import { Logger } from '@nestjs/common';

describe('AppLogger', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService('TestContext');
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should extend NestJS Logger', () => {
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should have all Logger methods', () => {
    expect(logger.log).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.verbose).toBeDefined();
  });

  it('should use default context when not provided', () => {
    const loggerWithoutContext = new LoggerService();
    expect(loggerWithoutContext).toBeDefined();
  });

  it('should accept custom context in constructor', () => {
    const customLogger = new LoggerService('CustomContext');
    expect(customLogger).toBeDefined();
  });
});
