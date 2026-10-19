import {
  AccountId,
  WalletId,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_REALFI } from '../../src/const';
import { CARDANO_NETWORK_MAGIC } from '../../src/realfi-network-config';
import { makeStakeActivities } from '../../src/store/side-effects';
import {
  realfiStakingActions,
  realfiStakingReducers,
} from '../../src/store/slice';

import type {
  RealFiProviderError,
  RealFiStakeActivity,
} from '../../src/provider-types';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const accountId = AccountId('acct-1');
const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const realfiFlag = {
  key: FEATURE_FLAG_REALFI,
  payload: { preview: {} },
};

const activity: RealFiStakeActivity = {
  id: 'tx-1',
  kind: 'stake',
  label: 'Stake',
  subtitle: '+100 sUSDrf',
  completed: true,
  requestDate: 1_700_000_000_000,
  steps: [{ key: 'stake', status: 'completed' }],
};

const actions = realfiStakingActions;

const stateObservables = (address: string | null) => ({
  addresses: {
    selectByAccountId$: of(() => (address ? [{ address }] : []) as never),
  },
  network: {
    selectActiveNetworkId$: of(() => previewNetworkId),
  },
  features: {
    selectLoadedFeatures$: of({ featureFlags: [realfiFlag], modules: [] }),
  },
  wallets: {
    selectActiveNetworkAccounts$: of([{ accountId }] as AnyAccount[]),
  },
});

const runStakeActivities = (
  getStakeActivities: ReturnType<typeof vi.fn>,
  assert: (emissions: unknown[]) => void,
  address: string | null = 'addr_test1xyz',
) => {
  const provider = { getStakeActivities } as never;
  testSideEffect(makeStakeActivities, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        stakeActivitiesRequested$: hot('-a', {
          a: actions.realfiPosition.stakeActivitiesRequested({ accountId }),
        }),
      },
      wallets: { removeAccount$: NEVER, removeWallet$: NEVER },
    },
    stateObservables: stateObservables(address),
    dependencies: { actions, realfiProviders: [provider] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeStakeActivities', () => {
  it('skips a request for an account that is not on the active network', () => {
    const getStakeActivities = vi
      .fn()
      .mockReturnValue(
        of(Ok({ activities: [activity], hasSwappedIntoUsdr: true })),
      );
    testSideEffect(makeStakeActivities, ({ hot, flush }) => ({
      actionObservables: {
        realfiPosition: {
          stakeActivitiesRequested$: hot('-a', {
            a: actions.realfiPosition.stakeActivitiesRequested({
              accountId: AccountId('previous-network-account'),
            }),
          }),
        },
        wallets: { removeAccount$: NEVER, removeWallet$: NEVER },
      },
      stateObservables: stateObservables('addr_test1xyz'),
      dependencies: {
        actions,
        realfiProviders: [{ getStakeActivities }] as never,
      },
      assertion: sideEffect$ => {
        const emissions: unknown[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();
        expect(getStakeActivities).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
    }));
  });

  it('emits stakeActivitiesReceived with the fetched activities', () => {
    const getStakeActivities = vi
      .fn()
      .mockReturnValue(
        of(Ok({ activities: [activity], hasSwappedIntoUsdr: true })),
      );

    runStakeActivities(getStakeActivities, emissions => {
      expect(getStakeActivities).toHaveBeenCalledWith(
        expect.objectContaining({ accountId, userAddress: 'addr_test1xyz' }),
      );
      expect(emissions).toEqual([
        actions.realfiPosition.stakeActivitiesReceived({
          accountId,
          activities: [activity],
          hasSwappedIntoUsdr: true,
        }),
      ]);
    });
  });

  it('keeps the previous data when the provider returns an error result', () => {
    const getStakeActivities = vi
      .fn()
      .mockReturnValue(
        of(Err<RealFiProviderError>({ code: 'VALIDATION', message: 'nope' })),
      );

    runStakeActivities(getStakeActivities, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('keeps the previous data when the read pipeline throws', () => {
    const getStakeActivities = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('boom')));

    runStakeActivities(getStakeActivities, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('does not call the provider when the account has no address', () => {
    const getStakeActivities = vi
      .fn()
      .mockReturnValue(
        of(Ok({ activities: [activity], hasSwappedIntoUsdr: true })),
      );

    runStakeActivities(
      getStakeActivities,
      emissions => {
        expect(getStakeActivities).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      null,
    );
  });
});

describe('makeStakeActivities response ownership', () => {
  const request = actions.realfiPosition.stakeActivitiesRequested({
    accountId,
  });
  const rowsWithId = (id: string) => ({
    activities: [{ ...activity, id }] as RealFiStakeActivity[],
    hasSwappedIntoUsdr: false,
  });
  const storedHistory = (
    sources$: { subscribe: (next: (action: never) => void) => unknown }[],
    flush: () => void,
  ) => {
    let state = realfiStakingReducers.realfiPosition(undefined, {
      type: 'init',
    });
    for (const source$ of sources$) {
      source$.subscribe(action => {
        state = realfiStakingReducers.realfiPosition(state, action);
      });
    }
    flush();
    return state.stakeActivitiesByAccount;
  };

  it('keeps the newer history when an older read finishes last', () => {
    testSideEffect(makeStakeActivities, ({ hot, cold, flush }) => {
      const getStakeActivities = vi
        .fn()
        .mockReturnValueOnce(cold('------a|', { a: Ok(rowsWithId('older')) }))
        .mockReturnValueOnce(cold('-a|', { a: Ok(rowsWithId('newer')) }));
      return {
        actionObservables: {
          realfiPosition: {
            stakeActivitiesRequested$: hot('-a-a', { a: request }),
          },
          wallets: { removeAccount$: NEVER, removeWallet$: NEVER },
        },
        stateObservables: stateObservables('addr_test1xyz'),
        dependencies: {
          actions,
          realfiProviders: [{ getStakeActivities }] as never,
        },
        assertion: sideEffect$ => {
          expect(
            storedHistory([sideEffect$ as never], flush)[accountId]?.map(
              row => row.id,
            ),
          ).toEqual(['newer']);
        },
      };
    });
  });

  it('does not store history for an account removed while its read was in flight', () => {
    testSideEffect(makeStakeActivities, ({ hot, cold, flush }) => {
      const removeWallet$ = hot('---a', {
        a: walletsActions.wallets.removeWallet(WalletId('wallet-1'), [
          accountId,
        ]),
      });
      return {
        actionObservables: {
          realfiPosition: {
            stakeActivitiesRequested$: hot('-a', { a: request }),
          },
          wallets: { removeAccount$: NEVER, removeWallet$ },
        },
        stateObservables: stateObservables('addr_test1xyz'),
        dependencies: {
          actions,
          realfiProviders: [
            {
              getStakeActivities: () =>
                cold('------a|', { a: Ok(rowsWithId('late')) }),
            },
          ] as never,
        },
        assertion: sideEffect$ => {
          expect(
            storedHistory(
              [removeWallet$ as never, sideEffect$ as never],
              flush,
            ),
          ).toEqual({});
        },
      };
    });
  });
});
