import { defer, EMPTY, finalize, NEVER, of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';

import { whileActive } from '../src/while-active';

describe('whileActive', () => {
  const testScheduler = () =>
    new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

  it('passes source emissions through while gate is true', () => {
    testScheduler().run(({ cold, hot, expectObservable }) => {
      const isActive$ = hot('t', { t: true });
      const source$ = cold<string>(' --a--b--c|', { a: '1', b: '2', c: '3' });

      expectObservable(source$.pipe(whileActive(isActive$))).toBe('--a--b--c', {
        a: '1',
        b: '2',
        c: '3',
      });
    });
  });

  it('blocks all emissions while gate starts false', () => {
    testScheduler().run(({ cold, hot, expectObservable }) => {
      const isActive$ = hot('f', { f: false });
      const source$ = cold<string>(' --a--b--c|', { a: '1', b: '2', c: '3' });

      expectObservable(source$.pipe(whileActive(isActive$))).toBe('-');
    });
  });

  it('stops emissions when gate transitions to false', () => {
    testScheduler().run(({ hot, expectObservable }) => {
      const isActive$ = hot('t-----f', { t: true, f: false });
      const source$ = hot<string>(' a-b-c-d-e', {
        a: '1',
        b: '2',
        c: '3',
        d: '4',
        e: '5',
      });

      expectObservable(source$.pipe(whileActive(isActive$))).toBe('a-b-c--', {
        a: '1',
        b: '2',
        c: '3',
      });
    });
  });

  it('runs finalize on the inner subscription when gate flips to false', () => {
    let finalizeCount = 0;
    testScheduler().run(({ hot, expectObservable }) => {
      const isActive$ = hot('t-----f', { t: true, f: false });
      const source$ = defer(() =>
        NEVER.pipe(finalize(() => (finalizeCount += 1))),
      );

      expectObservable(source$.pipe(whileActive(isActive$))).toBe('-');
    });
    expect(finalizeCount).toBe(1);
  });

  it('starts a fresh subscription on each false → true transition', () => {
    let subscribeCount = 0;
    testScheduler().run(({ hot, expectObservable }) => {
      const isActive$ = hot('t---f---t', { t: true, f: false });
      const source$ = defer(() => {
        subscribeCount += 1;
        return EMPTY;
      });

      expectObservable(source$.pipe(whileActive(isActive$))).toBe('-');
    });
    expect(subscribeCount).toBe(2);
  });

  it('forwards emissions that follow a false → true transition', () => {
    testScheduler().run(({ cold, hot, expectObservable }) => {
      const isActive$ = hot('   f---t', { t: true, f: false });
      const source$ = cold<string>('-a-b-c', { a: '1', b: '2', c: '3' });

      expectObservable(source$.pipe(whileActive(isActive$))).toBe(
        '-----a-b-c',
        { a: '1', b: '2', c: '3' },
      );
    });
  });

  it('does not subscribe when gate is false then completes', () => {
    let subscribeCount = 0;
    testScheduler().run(({ hot, expectObservable }) => {
      const isActive$ = hot('f---|', { f: false });
      const source$ = defer(() => {
        subscribeCount += 1;
        return of('x');
      });

      expectObservable(source$.pipe(whileActive(isActive$))).toBe('----|');
    });
    expect(subscribeCount).toBe(0);
  });

  it('deduplicates consecutive identical gate emissions', () => {
    let subscribeCount = 0;
    testScheduler().run(({ hot, expectObservable }) => {
      const isActive$ = hot('t-t-t', { t: true });
      const source$ = defer(() => {
        subscribeCount += 1;
        return EMPTY;
      });

      expectObservable(source$.pipe(whileActive(isActive$))).toBe('----');
    });
    expect(subscribeCount).toBe(1);
  });

  it('handles rapid true/false toggling without leaking subscriptions', () => {
    let subscribeCount = 0;
    let finalizeCount = 0;
    testScheduler().run(({ hot, expectObservable }) => {
      const isActive$ = hot('tftftft', {
        t: true,
        f: false,
      });
      const source$ = defer(() => {
        subscribeCount += 1;
        return NEVER.pipe(finalize(() => (finalizeCount += 1)));
      });

      expectObservable(source$.pipe(whileActive(isActive$))).toBe('-');
    });
    expect(subscribeCount).toBe(4);
    expect(subscribeCount - finalizeCount).toBeLessThanOrEqual(1);
  });
});
