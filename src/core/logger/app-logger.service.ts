import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppLogger extends Logger {
  constructor(context?: string) {
    super(context || 'AppLogger');
  }

  log(message: any, context?: string) {
    if (context !== undefined) {
      super.log(message, context);
    } else {
      super.log(message);
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (context !== undefined) {
      super.error(message, trace, context);
    } else if (trace !== undefined) {
      super.error(message, trace);
    } else {
      super.error(message);
    }
  }

  warn(message: any, context?: string) {
    if (context !== undefined) {
      super.warn(message, context);
    } else {
      super.warn(message);
    }
  }

  debug(message: any, context?: string) {
    if (context !== undefined) {
      super.debug(message, context);
    } else {
      super.debug(message);
    }
  }

  verbose(message: any, context?: string) {
    if (context !== undefined) {
      super.verbose(message, context);
    } else {
      super.verbose(message);
    }
  }
}
