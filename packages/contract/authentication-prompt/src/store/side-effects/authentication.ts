import { toEmpty } from '@cardano-sdk/util-rxjs';
import {
  EMPTY,
  concat,
  ignoreElements,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { authenticateRequests$ } from '../authenticate';

import type { SideEffect } from '../../contract';

/**
 * Internal side effect that dispatches Redux actions when authenticate is called.
 *
 * Checks isAvailable$ at request arrival time to determine what to do:
 * - action-authorization when busy: reject immediately (result$.next(false))
 * - wallet-unlock when busy: preempt the active prompt, wait for completed$, then proceed
 * - any purpose when idle: proceed normally
 *
 * In the wallet-unlock preemption path we wait for completed$ (which consumes the
 * preemption-caused completion), so makeExecuteRequest$ only ever sees the real
 * wallet-unlock completion — no skip needed.
 */
export const authenticateSideEffect: SideEffect = (
  { authenticationPrompt: { completed$ } },
  { authenticationPrompt: { isAvailable$ } },
  { actions },
) =>
  authenticateRequests$.pipe(
    mergeMap(({ config, result$ }) => {
      const makeExecuteRequest$ = () =>
        merge(
          of(actions.authenticationPrompt.requested(config)),
          completed$.pipe(
            take(1),
            tap(action => {
              result$.next(action.payload.success);
              result$.complete();
            }),
            toEmpty,
          ),
        );

      return isAvailable$.pipe(
        take(1),
        switchMap(isAvailable => {
          if (isAvailable) return makeExecuteRequest$();
          if (config.purpose === 'wallet-unlock') {
            return concat(
              of(actions.authenticationPrompt.preempted()),
              completed$.pipe(take(1), ignoreElements()),
              makeExecuteRequest$(),
            );
          }
          result$.next(false);
          result$.complete();
          return EMPTY;
        }),
      );
    }),
  );
