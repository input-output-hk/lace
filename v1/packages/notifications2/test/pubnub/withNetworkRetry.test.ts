import { TestScheduler } from 'rxjs/testing';
import { withNetworkRetry } from '../../src/PubNubProviders/withNetworkRetry';
import { NetworkError, AuthError, UnknownError } from '../../src/errors';
import { Observable, throwError } from 'rxjs';

describe('withNetworkRetry', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('passes through values when no error occurs', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('a|', { a: 'value' });
      const result$ = source$.pipe(withNetworkRetry({ initialInterval: 1 }));

      expectObservable(result$).toBe('a|', { a: 'value' });
    });
  });

  it('retries on network error and succeeds', () => {
    scheduler.run(({ expectObservable }) => {
      let attempt = 0;
      // eslint-disable-next-line no-magic-numbers
      const networkError = new NetworkError(500, 'Server Error');

      const source$ = new Observable<string>((subscriber) => {
        attempt++;
        // eslint-disable-next-line no-magic-numbers
        if (attempt < 3) {
          subscriber.error(networkError);
        } else {
          subscriber.next('success');
          subscriber.complete();
        }
      });

      // initialInterval=1: retry 1 at t=1ms, retry 2 at t=1+2=3ms
      // eslint-disable-next-line no-magic-numbers
      const result$ = source$.pipe(withNetworkRetry({ initialInterval: 1, maxRetries: 5 }));

      expectObservable(result$).toBe('---(a|)', { a: 'success' });
    });
  });

  it('does not retry on auth error', () => {
    scheduler.run(({ cold, expectObservable }) => {
      // eslint-disable-next-line no-magic-numbers
      const authError = new AuthError(403, 'Forbidden');

      const source$ = cold('a#', { a: 'before' }, authError);
      const result$ = source$.pipe(withNetworkRetry({ initialInterval: 1 }));

      expectObservable(result$).toBe('a#', { a: 'before' }, authError);
    });
  });

  it('does not retry on unknown error', () => {
    scheduler.run(({ expectObservable }) => {
      // eslint-disable-next-line no-magic-numbers
      const unknownError = new UnknownError(500, 'Internal');

      const source$ = throwError(() => unknownError);
      const result$ = source$.pipe(withNetworkRetry({ initialInterval: 1 }));

      expectObservable(result$).toBe('#', undefined, unknownError);
    });
  });

  it('gives up after max retries', () => {
    scheduler.run(({ expectObservable }) => {
      // eslint-disable-next-line no-magic-numbers
      const networkError = new NetworkError(500, 'Server Error');

      const source$ = throwError(() => networkError);
      // maxRetries=2: initial + 2 retries, then give up
      // retry 1 at t=1ms, retry 2 at t=1+2=3ms → error at t=3ms
      // eslint-disable-next-line no-magic-numbers
      const result$ = source$.pipe(withNetworkRetry({ initialInterval: 1, maxRetries: 2 }));

      expectObservable(result$).toBe('---#', undefined, networkError);
    });
  });
});
