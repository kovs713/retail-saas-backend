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

  describe('logging methods', () => {
    it('should call log method', () => {
      const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      logger.log('test message');

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should call error method with trace', () => {
      const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      logger.error('error message', 'stack trace');

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should call error method without trace', () => {
      const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      logger.error('error message');

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should call warn method', () => {
      const spy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      logger.warn('warning message');

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should call debug method', () => {
      const spy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

      logger.debug('debug message');

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should call verbose method', () => {
      const spy = jest.spyOn(Logger.prototype, 'verbose').mockImplementation();

      logger.verbose('verbose message');

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });
});
