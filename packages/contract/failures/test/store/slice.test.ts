import { describe, expect, it } from 'vitest';

import { failuresActions as actions } from '../../src/store/slice';
import { failuresReducers } from '../../src/store/slice';
import { FailureId } from '../../src/value-objects';

import type { FailuresSliceState } from '../../src/store/slice';
import type { Failure } from '../../src/types';

describe('failures slice', () => {
  const initialState: FailuresSliceState = {
    byId: {},
  };

  const mockFailure: Failure = {
    failureId: FailureId('test-failure-1'),
    message: 'sync.error.midnight-wallet-start-failed',
    retryAction: { type: 'test/retry' },
  };

  describe('addFailure', () => {
    it('adds a failure to the store', () => {
      const state = failuresReducers.failures(
        initialState,
        actions.failures.addFailure(mockFailure),
      );

      expect(state.byId[mockFailure.failureId]).toEqual(mockFailure);
    });

    it('replaces existing failure with same ID', () => {
      const stateWithFailure: FailuresSliceState = {
        byId: {
          [mockFailure.failureId]: mockFailure,
        },
      };

      const updatedFailure: Failure = {
        ...mockFailure,
        message: 'sync.error.unknown-error',
      };

      const state = failuresReducers.failures(
        stateWithFailure,
        actions.failures.addFailure(updatedFailure),
      );

      expect(state.byId[mockFailure.failureId]).toEqual(updatedFailure);
    });
  });

  describe('dismissFailure', () => {
    it('removes a failure from the store', () => {
      const stateWithFailure: FailuresSliceState = {
        byId: {
          [mockFailure.failureId]: mockFailure,
        },
      };

      const state = failuresReducers.failures(
        stateWithFailure,
        actions.failures.dismissFailure(mockFailure.failureId),
      );

      expect(state.byId[mockFailure.failureId]).toBeUndefined();
    });

    it('does nothing if failure does not exist', () => {
      const state = failuresReducers.failures(
        initialState,
        actions.failures.dismissFailure(FailureId('non-existent')),
      );

      expect(state).toEqual(initialState);
    });
  });
});
