import { Observable } from 'rxjs';

import type { Logger } from 'ts-log';
import type { Primitive } from 'type-fest';

export interface Shutdown {
  shutdown: () => void;
}

/** Recursively make all properties optional Do not recurse into O types */
export type DeepPartial<T, O = never> = T extends O | Primitive
  ? T
  : {
      [P in keyof T]?: DeepPartial<T[P], O>;
    };

export interface WithLogger {
  logger: Logger;
}

// https://stackoverflow.com/a/57117594
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Impossible<K extends keyof any> = {
  [P in K]: never;
};
export type NoExtraProperties<T, U> = Impossible<Exclude<keyof U, keyof T>> & U;

export type MakePropertiesObservable<T extends object> = {
  [Key in keyof T]: T[Key] extends (...args: infer Args) => infer R
    ? R extends Observable<unknown>
      ? T[Key]
      : (...params: Args) => Observable<Awaited<R>>
    : T[Key] extends Observable<unknown>
    ? T[Key]
    : Observable<T[Key]>;
};
