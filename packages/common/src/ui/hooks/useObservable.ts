import { bind } from '@react-rxjs/core';
import { useMemo } from 'react';
import { NEVER, Observable } from 'rxjs';

/**
 * @param {Observable<T>} observable - Source observable to be used by the hook.
 * @param {T} [defaultValue] - Default value that will be used if the observable
 * has not emitted any values.
 *
 * @returns latest emitted value of the observable; undefined if observable is undefined or hasn't emitted yet
 */
export const useObservable = <T>(observable: Observable<T> | undefined, defaultValue?: T): T => {
  const [boundObservable] = useMemo(() => bind<T>(observable || NEVER, defaultValue as T), [observable, defaultValue]);
  return boundObservable();
};
