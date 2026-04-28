import { filter, map, withLatestFrom } from 'rxjs';

import { failuresActions } from '../store';

import type { Failure } from '../types';
import type { FailureId } from '../value-objects';
import type { Observable, OperatorFunction } from 'rxjs';

/**
 * RxJS operator that auto-dismisses a failure when an operation succeeds.
 *
 * This operator:
 * 1. Takes a failureId observable
 * 2. Checks if the failure exists in the store
 * 3. Only emits dismissFailure action if the failure actually exists
 *
 * This prevents unnecessary action dispatches when a failure has already been dismissed.
 *
 * @param selectFailureById$ - Observable of the selector function to check failure existence
 * @returns RxJS operator that emits dismissFailure actions only when failures exist
 *
 * @example
 * ```typescript
 * // In a side effect:
 * return operation$.pipe(
 *   // ... operation logic ...
 *   map(() => MidnightWalletFailureId('wallet-123')),
 *   autoDismissFailureOnSuccess(selectFailureById$),
 * );
 * ```
 */
export const autoDismissFailureOnSuccess =
  <T extends FailureId>(
    selectFailureById$: Observable<(id: FailureId) => Failure | undefined>,
  ): OperatorFunction<
    T,
    ReturnType<typeof failuresActions.failures.dismissFailure>
  > =>
  source =>
    source.pipe(
      withLatestFrom(selectFailureById$),
      // Only proceed if failure exists
      filter(([failureId, selectFailureById]) => {
        const failure = selectFailureById(failureId);
        return failure !== undefined;
      }),
      // Emit dismissFailure action
      map(([failureId]) => failuresActions.failures.dismissFailure(failureId)),
    );
