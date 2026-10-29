import { Observable } from 'rxjs';

export type {
  DeepPartial,
  NoExtraProperties,
  WithLogger,
} from './common/types';

export interface Shutdown {
  shutdown: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any;

export type MakeFunctionObservable<T extends AnyFunction> = T extends (
  ...args: infer Args
) => infer R
  ? R extends Observable<unknown>
    ? T
    : (...params: Args) => Observable<Awaited<R>>
  : T;

export type MakePropertiesObservable<T extends object> = {
  [Key in keyof T]: T[Key] extends AnyFunction
    ? MakeFunctionObservable<T[Key]>
    : T[Key] extends Observable<unknown>
    ? T[Key]
    : Observable<T[Key]>;
};
