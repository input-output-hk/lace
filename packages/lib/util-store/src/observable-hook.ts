import { toEmpty } from '@cardano-sdk/util-rxjs';
import {
  Observable,
  Subject,
  filter,
  map,
  switchMap,
  take,
  tap,
  catchError,
  of,
} from 'rxjs';
import { v4 } from 'uuid';

import type { ObservedValueOf } from 'rxjs';

export const createObservableHook = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...params: any[]) => Observable<any>,
>() => {
  const request$ = new Subject<{ id: string; params: Parameters<T> }>();
  const result$ = new Subject<
    | {
        id: string;
        error: Error;
      }
    | {
        id: string;
        value: ObservedValueOf<ReturnType<T>>;
      }
  >();

  return {
    trigger: (...params: Parameters<T>) => {
      const id = v4();
      return new Observable<ObservedValueOf<ReturnType<T>>>(subscriber => {
        const subscription = result$
          .pipe(
            filter(result => result.id === id),
            map(result => {
              if ('error' in result) {
                throw result.error;
              }
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return result.value;
            }),
            take(1),
          )
          .subscribe(subscriber);

        request$.next({ id, params });
        return subscription;
      });
    },
    onRequest: (callback: T) =>
      request$.pipe(
        switchMap(({ id, params }) =>
          callback(...params).pipe(
            map(value => ({
              id,
              value: value as ObservedValueOf<ReturnType<T>>,
            })),
            catchError((error: Error) => {
              return of({
                id,
                error,
              });
            }),
          ),
        ),
        tap(result => {
          result$.next(result);
        }),
        toEmpty,
      ),
  };
};
