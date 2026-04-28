import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';

import { failuresActions } from '../../src/store';
import { autoDismissFailureOnSuccess } from '../../src/utils/auto-dismiss-failure-on-success';
import { FailureId } from '../../src/value-objects';

import type { Failure } from '../../src/types';

describe('autoDismissFailureOnSuccess', () => {
  const testScheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

  const failureId1 = FailureId('failure-1');
  const failureId2 = FailureId('failure-2');
  const failure1: Failure = {
    failureId: failureId1,
    message: 'sync.error.unknown-error',
  };

  it('only emits for failures that exist in the store', () => {
    testScheduler.run(({ cold, hot, expectObservable }) => {
      // Selector returns function where only failureId1 exists
      const selectFailureById$ = hot<(id: FailureId) => Failure | undefined>(
        'a',
        {
          a: (id: FailureId) => (id === failureId1 ? failure1 : undefined),
        },
      );

      // Source emits two failure IDs
      const source$ = cold<FailureId>('ab', {
        a: failureId1, // exists
        b: failureId2, // doesn't exist
      });

      const result$ = source$.pipe(
        autoDismissFailureOnSuccess(selectFailureById$),
      );

      // Selector already emitted, only failureId1 results in action
      expectObservable(result$).toBe('a-', {
        a: failuresActions.failures.dismissFailure(failureId1),
      });
    });
  });
});
