import { concatMap, delay, from, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { createRemoteStore } from '../../src/sw-script/create-remote-store';

import type { Action, State } from '@lace-contract/module';
import type { Store } from '@reduxjs/toolkit';

/**
 * Minimal redux Store stub. `getState` returns the provided full state;
 * `emit()` fires the single `state$` subscriber so we can assert what crosses
 * the bridge over `state$`.
 */
const makeStore = (state: Readonly<Record<string, unknown>>) => {
  let current = state;
  let listener: (() => void) | undefined;
  const store = {
    getState: () => current,
    dispatch: vi.fn(),
    subscribe: (callback: () => void) => {
      listener = callback;
      return () => {
        listener = undefined;
      };
    },
  } as unknown as Store<State, Action>;
  return {
    store,
    emit: () => listener?.(),
    /** Applies a new state and notifies, as one redux dispatch would. */
    setState: (next: Readonly<Record<string, unknown>>) => {
      current = next;
      listener?.();
    },
  };
};

const asState = (value: Record<string, unknown>): State =>
  value as unknown as State;

const asRecord = (value: State): Record<string, unknown> =>
  value as unknown as Record<string, unknown>;

// Empty (cold-boot) values for the deferred catalogs, as the combined reducer
// reports them before any data loads.
const initialSnapshot = {
  cardanoStakePools: { networkData: {}, poolDetails: {}, poolSummaries: {} },
  swapConfig: { slippage: 0.5, availableDexes: null },
  dappExplorer: { dappList: [], status: 'loading' },
};

// Full state as the live SW store holds it: real wallet slices plus populated
// catalogs.
const fullState = {
  wallets: { id: 'w1' },
  cardanoStakePools: {
    networkData: { mainnet: 'big' },
    poolDetails: {},
    poolSummaries: {},
  },
  swapConfig: { slippage: 0.5, availableDexes: ['a', 'b'] },
  dappExplorer: { dappList: [{ slug: 'x' }], status: 'success' },
};

describe('createRemoteStore', () => {
  describe('getFirstPaintState', () => {
    it('replaces deferred catalogs with their empty initial value and keeps other slices intact', async () => {
      const { store } = makeStore(fullState);
      const remoteStore = createRemoteStore(store, asState(initialSnapshot));

      const seed = asRecord(await remoteStore.getFirstPaintState());

      // Non-deferred slices pass through by reference.
      expect(seed.wallets).toBe(fullState.wallets);
      // Deferred catalogs are swapped for the empty initial value, not the full one.
      expect(seed.cardanoStakePools).toBe(initialSnapshot.cardanoStakePools);
      expect(seed.swapConfig).toBe(initialSnapshot.swapConfig);
      expect(seed.dappExplorer).toBe(initialSnapshot.dappExplorer);
    });

    it('does not invent a deferred slice that the initial snapshot omits (feature/module off)', async () => {
      // dappExplorer is absent from both snapshots — its module/flag is off.
      const initialWithoutDapp = {
        cardanoStakePools: initialSnapshot.cardanoStakePools,
        swapConfig: initialSnapshot.swapConfig,
      };
      const fullWithoutDapp = {
        wallets: { id: 'w1' },
        cardanoStakePools: fullState.cardanoStakePools,
        swapConfig: fullState.swapConfig,
      };
      const { store } = makeStore(fullWithoutDapp);

      const seed = asRecord(
        await createRemoteStore(
          store,
          asState(initialWithoutDapp),
        ).getFirstPaintState(),
      );

      expect('dappExplorer' in seed).toBe(false);
      expect(seed.cardanoStakePools).toBe(initialWithoutDapp.cardanoStakePools);
    });
  });

  describe('state$ (backfill source)', () => {
    it('emits the full state including populated catalogs, unaffected by the getFirstPaintState reduction', () => {
      vi.useFakeTimers();
      try {
        const { store, emit } = makeStore(fullState);
        const remoteStore = createRemoteStore(store, asState(initialSnapshot));

        const emissions: Record<string, unknown>[] = [];
        remoteStore.state$.subscribe(state => emissions.push(asRecord(state)));

        emit();
        // auditTime(16) coalesces emissions to one push per frame.
        vi.advanceTimersByTime(20);

        expect(emissions).toHaveLength(1);
        expect(emissions[0].cardanoStakePools).toEqual(
          fullState.cardanoStakePools,
        );
        expect(emissions[0].dappExplorer).toEqual(fullState.dappExplorer);
      } finally {
        vi.useRealTimers();
      }
    });

    it('coalesces a burst of dispatches into one push carrying the final state', () => {
      vi.useFakeTimers();
      try {
        const withConnector = (
          pendingSignTxRequest: { txHex: string } | null,
          signTxCompleted: boolean,
        ) => ({
          ...fullState,
          cardanoDappConnector: { pendingSignTxRequest, signTxCompleted },
        });
        const { store, setState } = makeStore(
          withConnector({ txHex: 'a' }, false),
        );
        const remoteStore = createRemoteStore(store, asState(initialSnapshot));

        const emissions: Record<string, unknown>[] = [];
        remoteStore.state$.subscribe(state => emissions.push(asRecord(state)));

        // The dApp signing queue's handover, as the flow emits it: request A
        // completes and the queued request B is served. Each dispatch gets its
        // own `delay(0)` hop, as `toEpic` (@lace-contract/module) gives every
        // side-effect emission, so the three arrive in three tasks rather than
        // one synchronous burst.
        from([
          withConnector({ txHex: 'a' }, true),
          withConnector(null, true),
          withConnector({ txHex: 'b' }, false),
        ])
          .pipe(concatMap(next => of(next).pipe(delay(0))))
          .subscribe(setState);
        vi.advanceTimersByTime(20);

        // Coalescing is load-bearing beyond frame rate: a UI that saw the
        // intermediate cleared request would close the sign popup mid-handover,
        // and request B, already bound to that window, would be auto-rejected
        // without the user ever seeing it.
        expect(emissions).toHaveLength(1);
        expect(emissions[0].cardanoDappConnector).toEqual({
          pendingSignTxRequest: { txHex: 'b' },
          signTxCompleted: false,
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
