import { filterRedacted } from '@lace-lib/util-redacted';

import { LogLevel, type ObservabilityProvider } from './types';

import type { Logger } from 'ts-log';

export class ObservableLogger implements Logger {
  public constructor(
    private readonly consoleLogger: Logger,
    private readonly observability: ObservabilityProvider,
  ) {}

  public trace(...params: unknown[]): void {
    this.consoleLogger.trace(...params);
  }

  public debug(...params: unknown[]): void {
    this.consoleLogger.debug(...params);
  }

  public info(...params: unknown[]): void {
    this.consoleLogger.info(...params);
  }

  public warn(...params: unknown[]): void {
    this.consoleLogger.warn(...params);
  }

  public error(...params: unknown[]): void {
    this.consoleLogger.error(...params);

    // If first param is an Error object, use captureException
    if (params[0] instanceof Error) {
      this.observability.captureException(params[0], {
        extra: { additionalParams: params.slice(1) },
      });
    } else {
      this.observability.captureMessage(
        this.formatMessage(params),
        LogLevel.ERROR,
      );
    }
  }

  private formatMessage(params: unknown[]): string {
    return params
      .map(p => {
        switch (typeof p) {
          case 'undefined':
            return 'undefined';
          case 'string':
            return p;
          case 'number':
          case 'boolean':
            return String(p);
          case 'bigint':
            return p.toString();
          case 'symbol':
            return p.description ? `Symbol(${p.description})` : 'Symbol()';
          case 'function':
            return p.name ? `[Function ${p.name}]` : '[Function]';
          case 'object':
            if (p === null) return 'null';
            if (p instanceof Error) {
              return `${p.name}: ${p.message}${p.stack ? `\n${p.stack}` : ''}`;
            }
            try {
              return JSON.stringify(filterRedacted(p));
            } catch {
              return '[unserializable]';
            }
        }

        const _exhaustiveCheck: never = p as never;
        return _exhaustiveCheck;
      })
      .join(' ');
  }
}
