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
import { makeYieldEarned } from '../../src/store/side-effects';
import {
  realfiStakingActions,
  realfiStakingReducers,
} from '../../src/store/slice';

import type {
  RealFiProviderError,
  RealFiYieldEarned,
} from '../../src/provider-types';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const previewNetworkId =
  `cardano-${CARDANO_NETWORK_MAGIC.preview}` as BlockchainNetworkId;

const realfiFlag = { key: FEATURE_FLAG_REALFI, payload: { preview: {} } };

const accountId = AccountId('acc-1');
const userAddress = 'addr_test1qz...';

const yieldEarned: RealFiYieldEarned = { yieldUsdrBaseUnits: '3565' };

const actions = realfiStakingActions;

const runYieldEarned = (
  getYieldEarned: ReturnType<typeof vi.fn>,
  assert: (emissions: unknown[]) => void,
  {
    featureFlags = [realfiFlag],
    addresses = [{ address: userAddress }],
    activeAccounts = [{ accountId }],
  }: {
    featureFlags?: object[];
    addresses?: { address: string }[];
    activeAccounts?: { accountId: string }[];
  } = {},
) => {
  const provider = { getYieldEarned } as never;
  testSideEffect(makeYieldEarned, ({ hot, flush }) => ({
    actionObservables: {
      realfiPosition: {
        stakeActivitiesRequested$: hot('-a', {
          a: actions.realfiPosition.stakeActivitiesRequested({ accountId }),
        }),
      },
      wallets: { removeAccount$: NEVER, removeWallet$: NEVER },
    },
    stateObservables: {
      addresses: {
        selectByAccountId$: of(() => addresses as never),
      },
      network: {
        selectActiveNetworkId$: of(() => previewNetworkId),
      },
      features: {
        selectLoadedFeatures$: of({ featureFlags, modules: [] }) as never,
      },
      wallets: {
        selectActiveNetworkAccounts$: of(activeAccounts as AnyAccount[]),
      },
    },
    dependencies: { actions, realfiProviders: [provider] },
    assertion: sideEffect$ => {
      const emissions: unknown[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assert(emissions);
    },
  }));
};

describe('makeYieldEarned', () => {
  it('reads the yield on a staking-history refresh and stores it under the account', () => {
    const read = vi.fn(() => of(Ok(yieldEarned)));
    runYieldEarned(read, emissions => {
      expect(read).toHaveBeenCalledTimes(1);
      const request = (read.mock.calls[0] as unknown[])[0] as {
        config: { realfiNetwork: string };
        accountId: string;
        addresses: string[];
      };
      expect(request.config.realfiNetwork).toBe('preview');
      expect(request.accountId).toBe(accountId);
      expect(request.addresses).toEqual([userAddress]);
      expect(emissions).toEqual([
        actions.realfiPosition.yieldEarnedReceived({ accountId, yieldEarned }),
      ]);
    });
  });

  it('asks for every distinct address of the account, not just the first', () => {
    const read = vi.fn(() => of(Ok(yieldEarned)));
    runYieldEarned(
      read,
      () => {
        const request = (read.mock.calls[0] as unknown[])[0] as {
          addresses: string[];
        };
        expect(request.addresses).toEqual(['addr-first', 'addr-second']);
      },
      {
        addresses: [
          { address: 'addr-first' },
          { address: 'addr-second' },
          { address: 'addr-first' },
        ],
      },
    );
  });

  it('keeps the previous figure when the provider reports an error result', () => {
    const read = vi.fn(() =>
      of(
        Err<RealFiProviderError>({
          code: 'PROVIDER_UNAVAILABLE',
          message: 'nope',
        }),
      ),
    );
    runYieldEarned(read, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('keeps the previous figure when the provider pipeline throws', () => {
    const read = vi.fn(() => throwError(() => new Error('boom')));
    runYieldEarned(read, emissions => {
      expect(emissions).toEqual([]);
    });
  });

  it('does nothing when the active network has no RealFi config', () => {
    const read = vi.fn(() => of(Ok(yieldEarned)));
    runYieldEarned(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      { featureFlags: [] },
    );
  });

  it('skips a request for an account that is not on the active network', () => {
    const read = vi.fn(() => of(Ok(yieldEarned)));
    runYieldEarned(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      { activeAccounts: [{ accountId: 'other-network-account' }] },
    );
  });

  it('does nothing when the account has no address yet', () => {
    const read = vi.fn(() => of(Ok(yieldEarned)));
    runYieldEarned(
      read,
      emissions => {
        expect(read).not.toHaveBeenCalled();
        expect(emissions).toEqual([]);
      },
      { addresses: [] },
    );
  });
});

describe('makeYieldEarned response ownership', () => {
  const otherAccountId = AccountId('acc-2');
  const requestFor = (id: AccountId) =>
    actions.realfiPosition.stakeActivitiesRequested({ accountId: id });
  const stateObservablesFor = (accounts: AccountId[]) => ({
    addresses: {
      selectByAccountId$: of(() => [{ address: userAddress }] as never),
    },
    network: { selectActiveNetworkId$: of(() => previewNetworkId) },
    features: {
      selectLoadedFeatures$: of({
        featureFlags: [realfiFlag],
        modules: [],
      }) as never,
    },
    wallets: {
      selectActiveNetworkAccounts$: of(
        accounts.map(id => ({ accountId: id })) as AnyAccount[],
      ),
    },
  });
  const yieldOf = (units: string) => Ok({ yieldUsdrBaseUnits: units });
  // Applies the side effect's actions (and any removal) to the real reducer.
  const storedYield = (
    actions$: { subscribe: (next: (action: never) => void) => unknown }[],
    flush: () => void,
  ) => {
    let state = realfiStakingReducers.realfiPosition(undefined, {
      type: 'init',
    });
    for (const source$ of actions$) {
      source$.subscribe(action => {
        state = realfiStakingReducers.realfiPosition(state, action);
      });
    }
    flush();
    return state.yieldEarnedByAccount;
  };

  it('keeps the newer figure when an older read finishes last', () => {
    testSideEffect(makeYieldEarned, ({ hot, cold, flush }) => {
      const getYieldEarned = vi
        .fn()
        .mockReturnValueOnce(cold('------a|', { a: yieldOf('1000') }))
        .mockReturnValueOnce(cold('-a|', { a: yieldOf('2000') }));
      return {
        actionObservables: {
          realfiPosition: {
            stakeActivitiesRequested$: hot('-a-a', {
              a: requestFor(accountId),
            }),
          },
          wallets: { removeAccount$: NEVER, removeWallet$: NEVER },
        },
        stateObservables: stateObservablesFor([accountId]),
        dependencies: {
          actions,
          realfiProviders: [{ getYieldEarned }] as never,
        },
        assertion: sideEffect$ => {
          expect(storedYield([sideEffect$ as never], flush)).toEqual({
            [accountId]: { yieldUsdrBaseUnits: '2000' },
          });
        },
      };
    });
  });

  it('reads different accounts concurrently instead of cancelling one for the other', () => {
    testSideEffect(makeYieldEarned, ({ hot, cold, flush }) => {
      const getYieldEarned = vi.fn((request: { accountId: AccountId }) =>
        cold('---a|', {
          a: yieldOf(request.accountId === accountId ? '1000' : '2000'),
        }),
      );
      return {
        actionObservables: {
          realfiPosition: {
            stakeActivitiesRequested$: hot('-ab', {
              a: requestFor(accountId),
              b: requestFor(otherAccountId),
            }),
          },
          wallets: { removeAccount$: NEVER, removeWallet$: NEVER },
        },
        stateObservables: stateObservablesFor([accountId, otherAccountId]),
        dependencies: {
          actions,
          realfiProviders: [{ getYieldEarned }] as never,
        },
        assertion: sideEffect$ => {
          expect(storedYield([sideEffect$ as never], flush)).toEqual({
            [accountId]: { yieldUsdrBaseUnits: '1000' },
            [otherAccountId]: { yieldUsdrBaseUnits: '2000' },
          });
        },
      };
    });
  });

  it('does not recreate the figure of an account removed while its read was in flight', () => {
    testSideEffect(makeYieldEarned, ({ hot, cold, flush }) => {
      const removeAccount$ = hot('---a', {
        a: walletsActions.wallets.removeAccount(
          WalletId('wallet-1'),
          accountId,
        ),
      });
      return {
        actionObservables: {
          realfiPosition: {
            stakeActivitiesRequested$: hot('-a', { a: requestFor(accountId) }),
          },
          wallets: { removeAccount$, removeWallet$: NEVER },
        },
        stateObservables: stateObservablesFor([accountId]),
        dependencies: {
          actions,
          realfiProviders: [
            { getYieldEarned: () => cold('------a|', { a: yieldOf('1000') }) },
          ] as never,
        },
        assertion: sideEffect$ => {
          expect(
            storedYield([removeAccount$ as never, sideEffect$ as never], flush),
          ).toEqual({});
        },
      };
    });
  });

  it("drops a removed wallet's in-flight reads but keeps an unrelated account's", () => {
    testSideEffect(makeYieldEarned, ({ hot, cold, flush }) => {
      const removeWallet$ = hot('---a', {
        a: walletsActions.wallets.removeWallet(WalletId('wallet-1'), [
          accountId,
        ]),
      });
      return {
        actionObservables: {
          realfiPosition: {
            stakeActivitiesRequested$: hot('-ab', {
              a: requestFor(accountId),
              b: requestFor(otherAccountId),
            }),
          },
          wallets: { removeAccount$: NEVER, removeWallet$ },
        },
        stateObservables: stateObservablesFor([accountId, otherAccountId]),
        dependencies: {
          actions,
          realfiProviders: [
            { getYieldEarned: () => cold('------a|', { a: yieldOf('1000') }) },
          ] as never,
        },
        assertion: sideEffect$ => {
          expect(
            storedYield([removeWallet$ as never, sideEffect$ as never], flush),
          ).toEqual({ [otherAccountId]: { yieldUsdrBaseUnits: '1000' } });
        },
      };
    });
  });
});
