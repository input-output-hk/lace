import { bind } from '@react-rxjs/core';
import { useMemo } from 'react';
import { NEVER } from 'rxjs';

import type { Observable } from 'rxjs';

/**
 * @param {Observable<T>} observable - Source observable to be used by the hook.
 * @param defaultValueFactory - Function that returns a default value to be used if the observable
 * has not emitted any values.
 *
 * @returns latest emitted value of the observable; undefined if observable is undefined or hasn't emitted yet
 */

export const useObservable = <T>(
  observable: Observable<T> | undefined,
  defaultValueFactory: () => T,
): T => {
  const defaultValue = useMemo(defaultValueFactory, [defaultValueFactory]);
  const [boundObservable] = useMemo(
    () => bind<T>(observable || NEVER, defaultValue),
    [observable, defaultValue],
  );
  return boundObservable();
};
