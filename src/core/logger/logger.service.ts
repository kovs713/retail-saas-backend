import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
  constructor(context?: string) {
    super(context || 'AppLogger');
  }

  log(message: any, context?: string) {
    super.log(message, ...(context ? [context] : []));
  }

  error(message: any, trace?: string, context?: string) {
    super.error(message, ...(trace ? [trace] : []), ...(context ? [context] : []));
  }

  warn(message: any, context?: string) {
    super.warn(message, ...(context ? [context] : []));
  }

  debug(message: any, context?: string) {
    super.debug(message, ...(context ? [context] : []));
  }

  verbose(message: any, context?: string) {
    super.verbose(message, ...(context ? [context] : []));
  }
}
