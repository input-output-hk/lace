import { bind } from '@react-rxjs/core';
import { useMemo } from 'react';
import { Observable } from 'rxjs';

/**
 * @param {Observable<T>} observable - Source observable to be used by the hook.
 * @param {T} [defaultValue] - Default value that will be used if the observable
 * has not emitted any values.
 *
 * @returns latest emitted value of the observable
 */
export const useObservable = <T>(observable: Observable<T>, defaultValue?: T): T => {
  const [boundObservable] = useMemo(() => bind<T>(observable, defaultValue), [observable, defaultValue]);
  return boundObservable();
};
