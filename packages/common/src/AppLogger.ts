/* eslint-disable no-console, no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from 'ts-log';
import { isNetworkError, stringifyWithFallback } from '@src/ui/lib';
import * as Sentry from '@sentry/react';

enum LogLevel {
  error = 0,
  warn = 1,
  info = 2,
  debug = 3,
  trace = 4
}

export type LogLevelString = keyof typeof LogLevel;

class AppLogger implements Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevelString = 'info') {
    if (!(logLevel in LogLevel)) {
      throw new Error(`Invalid log level: ${logLevel}`);
    }
    this.logLevel = LogLevel[logLevel];
  }

  private captureError(error: Error, extra: Record<string, any> = {}) {
    if (!this.sentryIntegrationEnabled) return;

    Sentry.captureException(error, {
      level: 'error',
      extra
    });
  }

  private convertParams(params: any[]) {
    return params.map((param) => {
      const [value, error] = stringifyWithFallback(param);
      if (error) {
        this.captureError(new Error('AppLogger: Failed to stringify the log param'), {
          error,
          param
        });
      }

      return value;
    });
  }

  private shouldLog(level: LogLevel) {
    return level <= this.logLevel;
  }

  setLogLevel(logLevel: LogLevelString) {
    this.logLevel = LogLevel[logLevel];
  }

  trace(...params: any[]): void {
    if (this.shouldLog(LogLevel.trace)) {
      console.trace(...this.convertParams(params));
    }
  }

  debug(...params: any[]): void {
    if (this.shouldLog(LogLevel.debug)) {
      console.debug(...this.convertParams(params));
    }
  }

  info(...params: any[]): void {
    if (this.shouldLog(LogLevel.info)) {
      console.info(...this.convertParams(params));
    }
  }

  warn(...params: any[]): void {
    if (this.shouldLog(LogLevel.warn)) {
      console.warn(...this.convertParams(params));
    }
  }

  error(...params: any[]): void {
    if (params.length === 0) return;

    const error = params.find((param) => param instanceof Error);
    const message = params.find((param) => typeof param === 'string');
    const stringifiedParams = this.convertParams(params);

    if (!error) {
      this.captureError(new Error(message || '[UNKNOWN ERROR]'), { error: stringifiedParams });
      console.error(...stringifiedParams);
      return;
    }

    if (isNetworkError(error)) {
      console.error('[NETWORK CONNECTION ERROR]', ...stringifiedParams);
      return;
    }

    this.captureError(error, { error: stringifiedParams });
    console.error(...stringifiedParams);
  }
}

export const logger = new AppLogger();
