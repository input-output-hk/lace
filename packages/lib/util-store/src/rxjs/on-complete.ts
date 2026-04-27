import { Observable } from 'rxjs';

export const onComplete =
  (callback: () => void) =>
  <T>(source: Observable<T>): Observable<T> =>
    new Observable(subscriber => {
      const sourceSubscription = source.subscribe({
        next: subscriber.next.bind(subscriber),
        error: subscriber.error.bind(subscriber),
        complete: () => {
          callback();
          subscriber.complete();
        },
      });
      return sourceSubscription.unsubscribe.bind(sourceSubscription);
    });
