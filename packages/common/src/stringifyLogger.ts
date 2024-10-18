/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from 'ts-log';
import { toSerializableObject } from '@cardano-sdk/util';

export class StringifyLogger implements Logger {
  private convertParams(params: any[]) {
    return params.map((param) =>
      param && typeof param === 'object' ? JSON.stringify(toSerializableObject(param)) : param
    );
  }

  trace(...params: any[]): void {
    console.trace(...this.convertParams(params));
  }

  debug(...params: any[]): void {
    console.debug(...this.convertParams(params));
  }

  info(...params: any[]): void {
    console.log(...this.convertParams(params));
  }

  warn(...params: any[]): void {
    console.warn(...this.convertParams(params));
  }

  error(...params: any[]): void {
    console.error(...this.convertParams(params));
  }

  fatal(...params: any[]): void {
    console.error(...this.convertParams(params));
  }
}

export const logger = new StringifyLogger();
