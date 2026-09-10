import { Cardano } from '@cardano-sdk/core';
import {
  EMPTY,
  firstValueFrom,
  of,
  timeout,
  TimeoutError,
  toArray,
} from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MIGRATE_WALLET_POOL_SELECTION_ID } from '../../../src/const';
import { makeConsumePoolSelection } from '../../../src/store/side-effects/consume-pool-selection';

import type { MigrateWalletStep } from '../../../src/store/slice';
import type { PoolSelection } from '@lace-contract/cardano-stake-pools';
import type { Observable } from 'rxjs';

const PICKED_POOL = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);

const selection = (selectionId: string): PoolSelection => ({
  selectionId,
  poolId: PICKED_POOL,
  ticker: 'PICK',
  poolName: 'Picked Pool',
  ros: 0.031,
});

const actions = {
  migrateWallet: {
    poolChosen: vi.fn((payload: unknown) => ({
      type: 'migrateWallet/poolChosen',
      payload,
    })),
  },
  cardanoStakePools: {
    poolSelectionCleared: vi.fn((payload: unknown) => ({
      type: 'cardanoStakePools/poolSelectionCleared',
      payload,
    })),
  },
  views: {
    setActiveSheetPage: vi.fn((payload: unknown) => ({
      type: 'views/setActiveSheetPage',
      payload,
    })),
  },
} as never;

const run = async ({
  poolSelection,
  step = 'choosePool',
  wizardCancelled$ = EMPTY as Observable<unknown>,
}: {
  poolSelection: PoolSelection | undefined;
  step?: MigrateWalletStep;
  wizardCancelled$?: Observable<unknown>;
}): Promise<{ type: string; payload?: unknown }[]> =>
  firstValueFrom(
    makeConsumePoolSelection()(
      { migrateWallet: { wizardCancelled$ } } as never,
      {
        cardanoStakePools: { selectPoolSelection$: of(poolSelection) },
        migrateWallet: { selectStep$: of(step) },
      } as never,
      { actions } as never,
    ).pipe(timeout({ first: 50 }), toArray()),
  ).catch((error: unknown) => {
    // A timeout means the effect (correctly) emitted nothing for this input.
    // Anything else — a throwing constructor, broken selector wiring — must
    // fail the test, not read as "emitted nothing".
    if (error instanceof TimeoutError)
      return [] as { type: string; payload?: unknown }[];
    throw error;
  });

describe('makeConsumePoolSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records the pick, clears the selection, and closes the picker sheet', async () => {
    const emitted = await run({
      poolSelection: selection(MIGRATE_WALLET_POOL_SELECTION_ID),
    });

    expect(emitted.map(action => action.type)).toEqual([
      'views/setActiveSheetPage',
      'migrateWallet/poolChosen',
      'cardanoStakePools/poolSelectionCleared',
    ]);
    /**
     * The dismissal goes through the views store, which the app router bridges
     * to a real `closeSheet`. Calling `NavigationControls` from here is
     * silently dropped on the extension, where the store runs in the service
     * worker and the navigation ref is never set — the wizard would sit behind
     * a picker that never closed.
     */
    expect(emitted[0].payload).toBeNull();
    expect(emitted[1].payload).toEqual({
      poolId: `${PICKED_POOL}`,
      ticker: 'PICK',
      ros: 0.031,
    });
    expect(emitted[2].payload).toEqual({
      selectionId: MIGRATE_WALLET_POOL_SELECTION_ID,
    });
  });

  it("ignores another flow's selection", async () => {
    const emitted = await run({
      poolSelection: selection('earn-rewards:acc-1'),
    });
    expect(emitted).toHaveLength(0);
  });

  // A matching id at any other step is stale state from an abandoned run, not
  // an instruction. Cleared rather than ignored: state observables never
  // re-emit an unchanged value, so residue in the slot only misleads.
  it('clears without consuming when the wizard is not at the pool choice', async () => {
    const emitted = await run({
      poolSelection: selection(MIGRATE_WALLET_POOL_SELECTION_ID),
      step: 'review',
    });
    expect(emitted.map(action => action.type)).toEqual([
      'cardanoStakePools/poolSelectionCleared',
    ]);
  });

  it('ignores the empty selection state', async () => {
    const emitted = await run({ poolSelection: undefined });
    expect(emitted).toHaveLength(0);
  });

  // A run abandoned mid-pick must leave nothing behind for the next one.
  it('clears the selection when the wizard is cancelled', async () => {
    const emitted = await run({
      poolSelection: undefined,
      wizardCancelled$: of({ type: 'migrateWallet/wizardCancelled' }),
    });
    expect(emitted.map(action => action.type)).toEqual([
      'cardanoStakePools/poolSelectionCleared',
    ]);
    expect(emitted[0].payload).toEqual({
      selectionId: MIGRATE_WALLET_POOL_SELECTION_ID,
    });
  });
});
