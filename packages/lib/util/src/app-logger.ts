/* eslint-disable no-console */
import type { Logger } from 'ts-log';

enum LogLevelValue {
  silent = -1,
  error = 0,
  warn = 1,
  info = 2,
  debug = 3,
  trace = 4,
}

export type LogLevel = keyof typeof LogLevelValue;

export class AppLogger implements Logger {
  private logLevel: LogLevelValue;

  public constructor(logLevel: LogLevel = 'info') {
    if (!(logLevel in LogLevelValue)) {
      throw new Error(`Invalid log level: ${logLevel}`);
    }
    this.logLevel = LogLevelValue[logLevel];
  }

  public setLogLevel(logLevel: LogLevel) {
    this.logLevel = LogLevelValue[logLevel];
  }

  public trace(...params: unknown[]): void {
    if (this.shouldLog(LogLevelValue.trace)) {
      console.trace(...params);
    }
  }

  public debug(...params: unknown[]): void {
    if (this.shouldLog(LogLevelValue.debug)) {
      console.debug(...params);
    }
  }

  public info(...params: unknown[]): void {
    if (this.shouldLog(LogLevelValue.info)) {
      console.info(...params);
    }
  }

  public warn(...params: unknown[]): void {
    if (this.shouldLog(LogLevelValue.warn)) {
      console.warn(...params);
    }
  }

  public error(...params: unknown[]): void {
    if (this.shouldLog(LogLevelValue.error)) {
      console.error(...params);
    }
  }

  private shouldLog(level: LogLevelValue) {
    return level <= this.logLevel;
  }
}
