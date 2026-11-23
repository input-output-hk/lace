import {
  catchError,
  combineLatest,
  concat,
  concatMap,
  defer,
  endWith,
  filter,
  finalize,
  from,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  takeUntil,
  timeout,
  withLatestFrom,
} from 'rxjs';

import { fetchTransactionFee } from '../fetch-transaction-fee';

import type { SideEffect } from '../../context';

export const createRecoverMissingFeesSideEffect =
  (fetchFee = fetchTransactionFee): SideEffect =>
  (actionObservables, stateObservables, { actions, midnightWallets$ }) => {
    const intent = actionObservables.midnightContext;
    const state = stateObservables.midnightContext;
    const active = new Set<string>();
    return intent.requestMissingFees$.pipe(
      withLatestFrom(
        state.selectFeeRecoveryJobs$,
        state.selectSupportsFeeRecovery$,
      ),
      filter(
        ([{ payload }, jobs]) =>
          !active.has(payload.requestId) &&
          jobs[payload.accountId]?.requestId === payload.requestId &&
          jobs[payload.accountId]?.status === 'running',
      ),
      mergeMap(([{ payload }, , supported]) => {
        const { accountId, requestId, networkId, indexerAddress } = payload;
        const finish = (status: 'cancelled' | 'complete' | 'failed') =>
          actions.midnightContext.finishFeeRecovery({
            accountId,
            requestId,
            status,
          });
        if (!supported) return of(finish('cancelled'));
        active.add(requestId);
        const environment$ = combineLatest([
          midnightWallets$,
          state.selectCurrentNetwork$,
          stateObservables.appLock.isUnlocked$,
        ]);
        const requestStopped$ = state.selectFeeRecoveryJobs$.pipe(
          filter(
            jobs =>
              jobs[accountId]?.requestId !== requestId ||
              jobs[accountId]?.status !== 'running',
          ),
        );
        return environment$.pipe(
          take(1),
          timeout(15000),
          switchMap(([wallets, network, unlocked]) => {
            const wallet = wallets[accountId];
            if (
              !unlocked ||
              !wallet ||
              wallet.networkId !== networkId ||
              network.networkId !== networkId ||
              network.config.indexerAddress !== indexerAddress
            )
              return of(finish('cancelled'));
            const stopped$ = merge(
              environment$.pipe(
                filter(
                  ([current, selected, isUnlocked]) =>
                    !isUnlocked ||
                    current[accountId] !== wallet ||
                    selected.networkId !== networkId ||
                    selected.config.indexerAddress !== indexerAddress,
                ),
              ),
              intent.cancelFeeRecovery$.pipe(
                filter(
                  action =>
                    action.payload.requestId === requestId &&
                    action.payload.accountId === accountId,
                ),
              ),
              actionObservables.activities.resetActivities$.pipe(
                filter(action => action.payload.accountId === accountId),
              ),
            );
            return combineLatest([
              wallet.transactionHistory$,
              state.selectRecoveredFees$,
            ]).pipe(
              take(1),
              timeout(15000),
              switchMap(([history, cached]) => {
                const hashes = [
                  ...new Set(
                    history
                      .filter(
                        entry =>
                          entry.lifecycle.status === 'finalized' &&
                          entry.fees == null,
                      )
                      .map(entry => entry.hash.toLowerCase())
                      .filter(
                        hash =>
                          /^[a-f0-9]{64}$/.test(hash) &&
                          cached[accountId]?.[hash] === undefined,
                      ),
                  ),
                ];
                return concat(
                  from(hashes).pipe(
                    concatMap(hash =>
                      defer(() => fetchFee(indexerAddress, hash)).pipe(
                        take(1),
                        timeout(15000),
                        map(fee =>
                          actions.midnightContext.feeRecoveryChecked({
                            accountId,
                            requestId,
                            hash,
                            fee,
                          }),
                        ),
                      ),
                    ),
                  ),
                  of(finish('complete')),
                );
              }),
              catchError(() => of(finish('failed'))),
              takeUntil(stopped$),
            );
          }),
          catchError(() => of(finish('failed'))),
          // Also stop while waiting for the initial wallet/environment snapshot.
          takeUntil(
            merge(
              requestStopped$,
              state.selectSupportsFeeRecovery$.pipe(
                filter(supported => !supported),
              ),
            ),
          ),
          // Terminal reducers ignore this after success/failure. Interrupted runs
          // keep fees already fetched, without accepting late responses.
          endWith(finish('cancelled')),
          finalize(() => active.delete(requestId)),
        );
      }),
    );
  };

export const clearRecoveredFeesOnReset: SideEffect = (
  { activities: { resetActivities$ } },
  _,
  { actions },
) =>
  resetActivities$.pipe(
    map(({ payload: { accountId } }) =>
      actions.midnightContext.clearRecoveredFees({ accountId }),
    ),
  );
