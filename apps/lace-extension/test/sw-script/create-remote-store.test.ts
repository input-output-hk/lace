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
  let listener: (() => void) | undefined;
  const store = {
    getState: () => state,
    dispatch: vi.fn(),
    subscribe: (callback: () => void) => {
      listener = callback;
      return () => {
        listener = undefined;
      };
    },
  } as unknown as Store<State, Action>;
  return { store, emit: () => listener?.() };
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
  });
});
