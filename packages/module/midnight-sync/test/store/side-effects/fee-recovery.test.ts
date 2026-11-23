import { activitiesActions } from '@lace-contract/activities';
import {
  feeRecoveryInitialState,
  feeRecoverySlice,
} from '@lace-contract/midnight-context/src/store/fee-recovery-slice';
import { AccountId } from '@lace-contract/wallet-repo';
import {
  BehaviorSubject,
  Subject,
  of,
  NEVER,
  filter,
  map,
  throwError,
  Observable,
} from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createRecoverMissingFeesSideEffect,
  clearRecoveredFeesOnReset,
} from '../../../src/store/side-effects/fee-recovery';

import type { SideEffect } from '../../../src/context';
import type {
  MidnightNetwork,
  MidnightWalletsByAccountId,
} from '@lace-contract/midnight-context';
import type { WalletEntry } from '@midnightntwrk/wallet-sdk';
import type { UnknownAction } from '@reduxjs/toolkit';

const accountId = AccountId('test-preview');
const hash = 'a'.repeat(64);
const second = 'b'.repeat(64);
const indexerAddress = 'https://indexer.example.test/graphql';
const actions = feeRecoverySlice.actions;
const intent = {
  accountId,
  requestId: 'one',
  networkId: 'preview' as const,
  indexerAddress,
};
const entry = (hash: string, fees?: bigint, status = 'finalized') =>
  ({ hash, fees, lifecycle: { status } } as WalletEntry);

const setup = (
  history: WalletEntry[],
  fetchFee = vi.fn(
    (_url: string, _hash: string): Observable<string | undefined> => of('42'),
  ),
) => {
  const input = new Subject<UnknownAction>();
  const state = new BehaviorSubject({
    ...feeRecoveryInitialState,
    supported: true,
  });
  const enabled = new BehaviorSubject(true);
  const unlocked = new BehaviorSubject(true);
  const network = new BehaviorSubject({
    networkId: 'preview',
    config: { indexerAddress },
  } as MidnightNetwork);
  const wallets = new BehaviorSubject({
    [accountId]: {
      accountId,
      networkId: 'preview',
      transactionHistory$: of(history),
    },
  } as unknown as MidnightWalletsByAccountId);
  const select = <T>(function_: (s: typeof state.value) => T) =>
    state.pipe(map(function_));
  const observations = {
    midnightContext: {
      requestMissingFees$: input.pipe(filter(actions.requestMissingFees.match)),
      cancelFeeRecovery$: input.pipe(filter(actions.cancelFeeRecovery.match)),
    },
    activities: {
      resetActivities$: input.pipe(
        filter(activitiesActions.activities.resetActivities.match),
      ),
    },
  };
  const stateObservations = {
    midnightContext: {
      selectSupportsFeeRecovery$: enabled,
      selectFeeRecoveryJobs$: select(s => s.jobs),
      selectRecoveredFees$: select(s => s.feesByAccount),
      selectCurrentNetwork$: network,
    },
    appLock: { isUnlocked$: unlocked },
  };
  const dependencies = {
    actions: { midnightContext: actions },
    midnightWallets$: wallets,
  };
  const dispatch = (action: UnknownAction) => {
    state.next(feeRecoverySlice.reducer(state.value, action));
    input.next(action);
  };
  const args = [
    observations,
    stateObservations,
    dependencies,
  ] as unknown as Parameters<SideEffect>;
  const subscription = createRecoverMissingFeesSideEffect(fetchFee)(
    ...args,
  ).subscribe(dispatch);
  subscription.add(clearRecoveredFeesOnReset(...args).subscribe(dispatch));
  return {
    fetchFee,
    state,
    unlocked,
    enabled,
    network,
    wallets,
    dispatch,
    subscription,
    start: () => {
      dispatch(actions.requestMissingFees(intent));
    },
  };
};
afterEach(() => vi.useRealTimers());

describe('explicit missing fee recovery', () => {
  it('rejects requests while disabled and allows a fresh request after enabling', () => {
    const h = setup([entry(hash)]);
    h.enabled.next(false);
    h.start();
    expect(h.fetchFee).not.toHaveBeenCalled();
    expect(h.state.value.jobs[accountId].status).toBe('cancelled');
    h.enabled.next(true);
    expect(h.fetchFee).not.toHaveBeenCalled();
    h.dispatch(actions.requestMissingFees({ ...intent, requestId: 'enabled' }));
    expect(h.fetchFee).toHaveBeenCalledOnce();
    h.enabled.next(false);
    expect(h.state.value.feesByAccount[accountId]).toEqual({ [hash]: '42' });
    h.subscription.unsubscribe();
  });

  it('fetches and caches only the requested account, even when other wallets share a transaction', () => {
    const h = setup([entry(hash)]);
    const otherAccountId = AccountId('other-preview');
    const otherHistory = vi.fn(() => of([entry(hash), entry(second)]));
    h.wallets.next({
      ...h.wallets.value,
      [otherAccountId]: {
        ...h.wallets.value[accountId],
        accountId: otherAccountId,
        transactionHistory$: new Observable(subscriber =>
          otherHistory().subscribe(subscriber),
        ),
      },
    });
    h.start();
    expect(otherHistory).not.toHaveBeenCalled();
    expect(h.fetchFee.mock.calls).toEqual([[indexerAddress, hash]]);
    expect(h.state.value.feesByAccount).toEqual({
      [accountId]: { [hash]: '42' },
    });
    expect(Object.keys(h.state.value.jobs)).toEqual([accountId]);
    h.subscription.unsubscribe();
  });
  it('does nothing without consent, then fetches only finalized missing fees and deduplicates', () => {
    const h = setup([
      entry(hash),
      entry(hash.toUpperCase()),
      entry(second, 0n),
      entry('c'.repeat(64), undefined, 'pending'),
      entry('d'.repeat(64), undefined, 'rejected'),
      entry('invalid'),
    ]);
    expect(h.fetchFee).not.toHaveBeenCalled();
    h.start();
    expect(h.fetchFee.mock.calls).toEqual([[indexerAddress, hash]]);
    expect(h.state.value.feesByAccount[accountId]).toEqual({ [hash]: '42' });
    expect(h.state.value.jobs[accountId]).toMatchObject({
      status: 'complete',
      checked: 1,
      recovered: 1,
    });
    h.subscription.unsubscribe();
  });
  it('keeps genuine zero, leaves unavailable fees absent and retries only missing entries', () => {
    const fetchFee = vi.fn((_url: string, h: string) =>
      of(h === hash ? '0' : undefined),
    );
    const h = setup([entry(hash), entry(second)], fetchFee);
    h.start();
    expect(h.state.value.feesByAccount[accountId]).toEqual({ [hash]: '0' });
    h.dispatch(actions.requestMissingFees({ ...intent, requestId: 'retry' }));
    expect(fetchFee.mock.calls.map(call => call[1])).toEqual([
      hash,
      second,
      second,
    ]);
    h.subscription.unsubscribe();
  });
  it.each([
    'flag',
    'lock',
    'network',
    'provider',
    'remove',
    'cancel',
    'reset',
  ] as const)('aborts on %s and ignores late results', reason => {
    const response = new Subject<string>();
    const teardown = vi.fn();
    const fetchFee = vi.fn(
      () =>
        new Observable<string>(subscriber => {
          const sub = response.subscribe(subscriber);
          return () => {
            sub.unsubscribe();
            teardown();
          };
        }),
    );
    const h = setup([entry(hash), entry(second)], fetchFee);
    h.start();
    if (reason === 'flag') h.enabled.next(false);
    if (reason === 'lock') h.unlocked.next(false);
    if (reason === 'network')
      h.network.next({ ...h.network.value, networkId: 'preprod' });
    if (reason === 'provider')
      h.network.next({
        ...h.network.value,
        config: {
          ...h.network.value.config,
          indexerAddress: 'https://other.example.test',
        },
      });
    if (reason === 'remove') h.wallets.next({});
    if (reason === 'cancel') h.dispatch(actions.cancelFeeRecovery(intent));
    if (reason === 'reset')
      h.dispatch(activitiesActions.activities.resetActivities({ accountId }));
    response.next('99');
    expect(teardown).toHaveBeenCalledOnce();
    expect(fetchFee).toHaveBeenCalledOnce();
    expect(h.state.value.feesByAccount).toEqual({});
    expect(h.state.value.jobs[accountId]?.status).toBe(
      reason === 'reset' ? undefined : 'cancelled',
    );
    h.subscription.unsubscribe();
  });
  it('rejects stale consent before sending any query', () => {
    const h = setup([entry(hash)]);
    h.network.next({ ...h.network.value, networkId: 'preprod' });
    h.start();
    expect(h.fetchFee).not.toHaveBeenCalled();
    expect(h.state.value.jobs[accountId].status).toBe('cancelled');
    h.subscription.unsubscribe();
  });
  it('retains completed lookups after an error and can retry', () => {
    const fetchFee = vi.fn((_url: string, h: string) =>
      h === hash ? of('12') : throwError(() => new Error('unavailable')),
    );
    const h = setup([entry(hash), entry(second)], fetchFee);
    h.start();
    expect(h.state.value.jobs[accountId]).toMatchObject({
      status: 'failed',
      recovered: 1,
    });
    h.dispatch(actions.requestMissingFees({ ...intent, requestId: 'retry' }));
    expect(fetchFee.mock.calls.map(call => call[1])).toEqual([
      hash,
      second,
      second,
    ]);
    expect(h.state.value.feesByAccount[accountId]).toEqual({ [hash]: '12' });
    h.subscription.unsubscribe();
  });
  it('does not start another query for a repeated active request', () => {
    const h = setup(
      [entry(hash)],
      vi.fn(() => NEVER),
    );
    h.start();
    h.start();
    h.dispatch(
      actions.requestMissingFees({ ...intent, requestId: 'duplicate' }),
    );
    expect(h.fetchFee).toHaveBeenCalledOnce();
    h.subscription.unsubscribe();
  });
  it('bounds an unresponsive query', () => {
    vi.useFakeTimers();
    const h = setup(
      [entry(hash)],
      vi.fn(() => NEVER),
    );
    h.start();
    vi.advanceTimersByTime(15000);
    expect(h.state.value.jobs[accountId].status).toBe('failed');
    h.subscription.unsubscribe();
  });
  it('ignores late actions from an earlier request and isolates account caches', () => {
    const h = setup(
      [entry(hash)],
      vi.fn(() => NEVER),
    );
    h.start();
    h.dispatch(actions.cancelFeeRecovery(intent));
    h.dispatch(actions.requestMissingFees({ ...intent, requestId: 'retry' }));
    h.dispatch(actions.feeRecoveryChecked({ ...intent, hash, fee: '7' }));
    h.dispatch(
      actions.feeRecoveryChecked({
        ...intent,
        requestId: 'retry',
        accountId: AccountId('other'),
        hash,
        fee: '8',
      }),
    );
    expect(h.state.value.feesByAccount).toEqual({});
    h.subscription.unsubscribe();
  });
});
