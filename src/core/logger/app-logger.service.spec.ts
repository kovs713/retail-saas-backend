import { AppLogger } from './app-logger.service';

import { Logger } from '@nestjs/common';

describe('AppLogger', () => {
  let logger: AppLogger;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let verboseSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new AppLogger('TestContext');

    logSpy = jest.spyOn(Logger.prototype, 'log');
    errorSpy = jest.spyOn(Logger.prototype, 'error');
    warnSpy = jest.spyOn(Logger.prototype, 'warn');
    debugSpy = jest.spyOn(Logger.prototype, 'debug');
    verboseSpy = jest.spyOn(Logger.prototype, 'verbose');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should call parent Logger.log with message only', () => {
      logger.log('Test message');

      expect(logSpy).toHaveBeenCalledWith('Test message');
    });

    it('should call parent Logger.log with message and context', () => {
      logger.log('Test message', 'CustomContext');

      expect(logSpy).toHaveBeenCalledWith('Test message', 'CustomContext');
    });

    it('should use default context when not provided', () => {
      const loggerWithoutContext = new AppLogger();
      loggerWithoutContext.log('Test message');

      expect(logSpy).toHaveBeenCalledWith('Test message');
    });
  });

  describe('error', () => {
    it('should call parent Logger.error with message only', () => {
      logger.error('Error message');

      expect(errorSpy).toHaveBeenCalledWith('Error message');
    });

    it('should call parent Logger.error with message and trace', () => {
      logger.error('Error message', 'Stack trace');

      expect(errorSpy).toHaveBeenCalledWith('Error message', 'Stack trace');
    });

    it('should call parent Logger.error with message, trace, and context', () => {
      logger.error('Error message', 'Stack trace', 'CustomContext');

      expect(errorSpy).toHaveBeenCalledWith('Error message', 'Stack trace', 'CustomContext');
    });

    it('should handle undefined trace', () => {
      logger.error('Error message', undefined, 'CustomContext');

      expect(errorSpy).toHaveBeenCalledWith('Error message', undefined, 'CustomContext');
    });
  });

  describe('warn', () => {
    it('should call parent Logger.warn with message only', () => {
      logger.warn('Warning message');

      expect(warnSpy).toHaveBeenCalledWith('Warning message');
    });

    it('should call parent Logger.warn with message and context', () => {
      logger.warn('Warning message', 'CustomContext');

      expect(warnSpy).toHaveBeenCalledWith('Warning message', 'CustomContext');
    });
  });

  describe('debug', () => {
    it('should call parent Logger.debug with message only', () => {
      logger.debug('Debug message');

      expect(debugSpy).toHaveBeenCalledWith('Debug message');
    });

    it('should call parent Logger.debug with message and context', () => {
      logger.debug('Debug message', 'CustomContext');

      expect(debugSpy).toHaveBeenCalledWith('Debug message', 'CustomContext');
    });
  });

  describe('verbose', () => {
    it('should call parent Logger.verbose with message only', () => {
      logger.verbose('Verbose message');

      expect(verboseSpy).toHaveBeenCalledWith('Verbose message');
    });

    it('should call parent Logger.verbose with message and context', () => {
      logger.verbose('Verbose message', 'CustomContext');

      expect(verboseSpy).toHaveBeenCalledWith('Verbose message', 'CustomContext');
    });
  });

  describe('inheritance', () => {
    it('should extend NestJS Logger', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should have Logger methods', () => {
      expect(logger.log).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.verbose).toBeDefined();
    });
  });
});
