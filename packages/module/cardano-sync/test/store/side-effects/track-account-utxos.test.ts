import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import {
  CardanoPaymentAddress,
  CardanoRewardAccount,
  cardanoContextActions,
  CardanoUtxoFetchFailureId,
  UTXO_SYNC_CONFIRMATION_DEPTH,
  UtxoCacheKey,
} from '@lace-contract/cardano-context';
import {
  cardanoAccount0Addr,
  chainId,
  threeAccountCardanoWalletAccounts,
} from '@lace-contract/cardano-context/test/mocks';
import { failuresActions } from '@lace-contract/failures';
import { Err, Ok, Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { defer, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { trackAccountUtxos } from '../../../src/store/side-effects/track-account-utxos';

import type { CardanoSyncAction } from '../../../src';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountUtxoMap,
  CardanoProviderDependencies,
} from '@lace-contract/cardano-context';
import type { Failure, FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AnyAccount, AccountId } from '@lace-contract/wallet-repo';

const actions = {
  ...cardanoContextActions,
  ...failuresActions,
};

const noFailureSelector = (_id: FailureId): Failure | undefined => undefined;

const account = threeAccountCardanoWalletAccounts[0];
const { accountId } = account;

const otherAccount = threeAccountCardanoWalletAccounts[1];
const otherAccountId = otherAccount.accountId;

const rewardAccount1 = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);
const rewardAccount2 = CardanoRewardAccount(
  'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
);

const mockAddress1: AnyAddress = {
  ...cardanoAccount0Addr,
  accountId,
  data: {
    rewardAccount: rewardAccount1,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

const mockAddress2: AnyAddress = {
  address: CardanoPaymentAddress(
    'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
  ),
  accountId,
  blockchainName: 'Cardano',
  data: {
    rewardAccount: rewardAccount2,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

const otherAccountRewardAccount = CardanoRewardAccount(
  'stake_test1uzrv96uyn4dlptal4wzsgwgghy25ypr5sx6fd6uwccrdehg3q0wd8',
);

const otherAccountAddress: AnyAddress = {
  address: CardanoPaymentAddress(
    'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g',
  ),
  accountId: otherAccountId,
  blockchainName: 'Cardano',
  data: {
    rewardAccount: otherAccountRewardAccount,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

const legitimateUtxoForAddr1: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
    ),
    txId: Cardano.TransactionId(
      '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
    ),
    index: 0,
  },
  {
    address: Cardano.PaymentAddress(
      'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
    ),
    value: { coins: BigInt(10), assets: new Map() },
  },
];

const freshUtxoForAddr1: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
    ),
    txId: Cardano.TransactionId(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ),
    index: 0,
  },
  {
    address: Cardano.PaymentAddress(
      'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
    ),
    value: { coins: BigInt(7), assets: new Map() },
  },
];

const legitimateUtxoForAddr2: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
    ),
    txId: Cardano.TransactionId(
      '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
    ),
    index: 1,
  },
  {
    address: Cardano.PaymentAddress(
      'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
    ),
    value: { coins: BigInt(5), assets: new Map() },
  },
];

const frankenUtxo: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
    ),
    txId: Cardano.TransactionId(
      '1111111111111111111111111111111111111111111111111111111111111111',
    ),
    index: 0,
  },
  {
    address: Cardano.PaymentAddress(
      'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
    ),
    value: { coins: BigInt(5_000_000), assets: new Map() },
  },
];

// Owns `frankenUtxo`'s address — same stake key as mockAddress1 so the stake
// key set doesn't change between emissions. Simulates an address that a manual
// thorough discovery finds at a high payment index.
const mockAddressOwningFrankenUtxo: AnyAddress = {
  address: CardanoPaymentAddress(
    'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
  ),
  accountId,
  blockchainName: 'Cardano',
  data: {
    rewardAccount: rewardAccount1,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

const nonRetriableError = new ProviderError(ProviderFailure.BadRequest);
const retriableError = new ProviderError(ProviderFailure.Unhealthy);

const txActivity = (id: string, slot?: number): Activity => ({
  accountId,
  activityId: id,
  timestamp: Timestamp(id.length),
  tokenBalanceChanges: [],
  type: ActivityType.Send,
  ...(slot !== undefined && {
    blockchainSpecific: { Cardano: { slot: Cardano.Slot(slot) } },
  }),
});

const pendingActivity = (id: string): Activity => ({
  accountId,
  activityId: id,
  timestamp: Timestamp(id.length),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
});

const rewardActivity = (id: string): Activity => ({
  accountId,
  activityId: id,
  timestamp: Timestamp(id.length),
  tokenBalanceChanges: [],
  type: ActivityType.Rewards,
});

// Most tests in this file run with a single-address account; multi-address
// scenarios construct their own keys inline.
const cacheKeyFor1 = UtxoCacheKey({
  topOnChainActivityId: 'tx-1',
  stakeKeys: [rewardAccount1],
  accountAddressCount: 1,
});
const cacheKeyFor2 = UtxoCacheKey({
  topOnChainActivityId: 'tx-2',
  stakeKeys: [rewardAccount1],
  accountAddressCount: 1,
});
// Key used for the initial fetch before any on-chain activity is loaded —
// must match the `NO_ACTIVITY_CACHE_KEY_SENTINEL` in the side effect.
const cacheKeyNoActivity = UtxoCacheKey({
  topOnChainActivityId: 'no-activity',
  stakeKeys: [rewardAccount1],
  accountAddressCount: 1,
});
const cacheKeyMulti = UtxoCacheKey({
  topOnChainActivityId: 'tx-1',
  stakeKeys: [rewardAccount1, rewardAccount2],
  accountAddressCount: 2,
});

type PersistedCacheKeys = Partial<Record<AccountId, UtxoCacheKey>>;
const emptyPersisted: PersistedCacheKeys = {};
const emptyStoredUtxos: AccountUtxoMap = {};
const emptyFailures: Record<FailureId, Failure> = {};
const undefinedTip: Cardano.Tip | undefined = undefined;

describe('trackAccountUtxos', () => {
  it('fetches UTxOs on initial emission when account has a most recent transaction', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // Initial fetch: utxos differ from empty stored, so utxos write +
          // cacheKey advance fire in the same sync group.
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyFor1,
            }),
          });
        },
      };
    });
  });

  it('skips fetch on cold start when persisted cache key matches current state', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      const getAccountUtxos = vi.fn();

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: { [accountId]: cacheKeyFor1 } as PersistedCacheKeys,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
          flush();
          expect(getAccountUtxos).not.toHaveBeenCalled();
        },
      };
    });
  });

  it('refetches when the most recent transaction hash changes', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      // Second activity at frame 5 so the marble `(ab)-(cd)` (which emits
      // the second sync group at frame 5) lines up with the side-effect's
      // emission timing.
      const activities$ = cold<Record<string, Activity[]>>('a----b', {
        a: { [accountId]: [txActivity('tx-1')] },
        b: { [accountId]: [txActivity('tx-2'), txActivity('tx-1')] },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)-(cd)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyFor1,
            }),
            c: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            d: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyFor2,
            }),
          });
        },
      };
    });
  });

  it('refetches when the stake-key set changes even if tx hash stays the same', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      // Second address emission at frame 5 to line up with marble
      // `(ab)-(cd)` (second sync group emits at frame 5).
      const addresses$ = cold<AnyAddress[]>('a----b', {
        a: [mockAddress1],
        b: [mockAddress1, mockAddress2],
      });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(({ rewardAccount }) => {
          if (rewardAccount === rewardAccount1)
            return cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) });
          if (rewardAccount === rewardAccount2)
            return cold('(a|)', { a: Ok([legitimateUtxoForAddr2]) });
          return cold('(a|)', { a: Ok([]) });
        });

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)-(cd)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyFor1,
            }),
            c: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1, legitimateUtxoForAddr2],
            }),
            d: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyMulti,
            }),
          });
        },
      };
    });
  });

  it('fetches with a no-activity key while only a Pending activity is loaded, then refetches when an on-chain activity appears', () => {
    testSideEffect(trackAccountUtxos, ({ cold, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      // frame 0: only a Pending → fetch off addresses with the no-activity
      // key. frame 2: on-chain tx appears → cache key advances to tx-1, refetch.
      const activities$ = cold<Record<string, Activity[]>>('a-b', {
        a: { [accountId]: [pendingActivity('pending-1')] },
        b: {
          [accountId]: [pendingActivity('pending-1'), txActivity('tx-1')],
        },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          const emitted: CardanoSyncAction[] = [];
          sideEffect$.subscribe(action => emitted.push(action));
          flush();

          expect(getAccountUtxos).toHaveBeenCalledTimes(2);
          const advancedCacheKeys = emitted
            .filter(actions.cardanoContext.setLastFetchedUtxoCacheKey.match)
            .map(action => action.payload.cacheKey);
          expect(advancedCacheKeys).toEqual([cacheKeyNoActivity, cacheKeyFor1]);
        },
      };
    });
  });

  it('does not refetch when the most recent transaction hash is unchanged', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      // activities map changes (e.g. new reward added) but top tx activityId stays `tx-1`
      const activities$ = cold<Record<string, Activity[]>>('a-b', {
        a: { [accountId]: [txActivity('tx-1')] },
        b: {
          [accountId]: [txActivity('tx-1'), rewardActivity('reward-1')],
        },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyFor1,
            }),
          });
          flush();
          expect(getAccountUtxos).toHaveBeenCalledTimes(1);
        },
      };
    });
  });

  it('fetches with a no-activity cache key when the account has no activities yet', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', { a: {} });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyNoActivity,
            }),
          });
          flush();
          expect(getAccountUtxos).toHaveBeenCalledTimes(1);
        },
      };
    });
  });

  it('fetches with a no-activity cache key when the account only has reward activities', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [rewardActivity('reward-1')] },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyNoActivity,
            }),
          });
          flush();
          expect(getAccountUtxos).toHaveBeenCalledTimes(1);
        },
      };
    });
  });

  it('merges UTxOs across multiple stake keys for one account', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', {
        a: [mockAddress1, mockAddress2],
      });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(({ rewardAccount }) => {
          if (rewardAccount === rewardAccount1)
            return cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) });
          if (rewardAccount === rewardAccount2)
            return cold('(a|)', { a: Ok([legitimateUtxoForAddr2]) });
          return cold('(a|)', { a: Ok([]) });
        });

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1, legitimateUtxoForAddr2],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyMulti,
            }),
          });
          flush();
          expect(getAccountUtxos).toHaveBeenCalledTimes(2);
        },
      };
    });
  });

  it('filters franken UTxOs and logs them', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1, frankenUtxo]) }),
        );
      const logger = { ...dummyLogger, warn: vi.fn() };

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyFor1,
            }),
          });
          flush();
          expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Filtered 1 franken UTxOs'),
          );
        },
      };
    });
  });

  it('re-fetches and reclassifies a previously-franken UTxO as legitimate when discovery adds the owning address', () => {
    // Regression: address-discovery (e.g. manual thorough sync) can upsert a
    // new owned address that shares a stake key with an existing one. The
    // Blockfrost-returned UTxO for that address was dropped as franken in the
    // first round because ownedCredentials didn't include it. The cacheKey
    // must invalidate on address-count change so the next round re-fetches and
    // re-filters with the wider ownedCredentials set.
    testSideEffect(trackAccountUtxos, ({ cold, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      // Address set widens at frame 1 (simulates upsertAddresses after discovery).
      const addresses$ = cold<AnyAddress[]>('ab', {
        a: [mockAddress1],
        b: [mockAddress1, mockAddressOwningFrankenUtxo],
      });
      // Same activity throughout — chain state hasn't changed, only ownership has.
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });
      // Blockfrost returns the same two UTxOs both times; second emission's
      // wider ownedCredentials reclassifies frankenUtxo as legitimate.
      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1, frankenUtxo]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          const emissions: CardanoSyncAction[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          // Both rounds fetch — the address-count change invalidates the cache.
          expect(getAccountUtxos).toHaveBeenCalledTimes(2);

          const setActions = emissions.filter(
            actions.cardanoContext.setAccountUtxos.match,
          );
          expect(setActions).toHaveLength(2);

          // First round: only the legitimate UTxO; franken is dropped.
          expect(setActions[0]).toEqual(
            actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
          );

          // Second round: both UTxOs — frankenUtxo is now owned.
          expect(setActions[1]).toEqual(
            actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1, frankenUtxo],
            }),
          );

          const cacheKeyActions = emissions.filter(
            actions.cardanoContext.setLastFetchedUtxoCacheKey.match,
          );
          expect(cacheKeyActions).toHaveLength(2);

          expect(cacheKeyActions[0]).toEqual(
            actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: UtxoCacheKey({
                topOnChainActivityId: 'tx-1',
                stakeKeys: [rewardAccount1],
                accountAddressCount: 1,
              }),
            }),
          );

          expect(cacheKeyActions[1]).toEqual(
            actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: UtxoCacheKey({
                topOnChainActivityId: 'tx-1',
                stakeKeys: [rewardAccount1],
                accountAddressCount: 2,
              }),
            }),
          );
        },
      };
    });
  });

  it('does not fetch when the account has no stake keys in its addresses', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      // No addresses for this account
      const addresses$ = cold<AnyAddress[]>('a', { a: [] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      const getAccountUtxos = vi.fn();

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
          flush();
          expect(getAccountUtxos).not.toHaveBeenCalled();
        },
      };
    });
  });

  it('surfaces a retryable failure on non-retriable provider errors', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      const getAccountUtxos = vi
        .fn()
        .mockReturnValue(of(Err(nonRetriableError)));

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.failures.addFailure({
              failureId: CardanoUtxoFetchFailureId(accountId),
              message: 'sync.error.cardano-utxo-fetch-failed' as TranslationKey,
            }),
          });
          flush();
          expect(getAccountUtxos).toHaveBeenCalledTimes(1);
        },
      };
    });
  });

  it('retries retriable errors with exponential backoff before surfacing a failure', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      let subscriptions = 0;
      const getAccountUtxos = vi.fn().mockImplementation(() =>
        defer(() => {
          subscriptions += 1;
          return cold('-#', {}, retriableError);
        }),
      );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // 4 attempts: errors at frames 1, 302, 903, 2104.
          // retryBackoff delays: 300ms, 600ms, 1200ms (total 2100ms).
          expectObservable(sideEffect$).toBe('2104ms a', {
            a: actions.failures.addFailure({
              failureId: CardanoUtxoFetchFailureId(accountId),
              message: 'sync.error.cardano-utxo-fetch-failed' as TranslationKey,
            }),
          });
          flush();
          // 1 initial attempt + 3 retries
          expect(subscriptions).toBe(4);
        },
      };
    });
  });

  it('recovers without emitting an error when a retry succeeds', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      let subscriptions = 0;
      const getAccountUtxos = vi.fn().mockImplementation(() =>
        defer(() => {
          subscriptions += 1;
          if (subscriptions === 1) return cold('-#', {}, retriableError);
          return cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) });
        }),
      );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // error at frame 1, retryBackoff waits 300ms, retry subscribed + emits at frame 301.
          expectObservable(sideEffect$).toBe('301ms (ab)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyFor1,
            }),
          });
          flush();
          // 1 failed attempt + 1 successful retry
          expect(subscriptions).toBe(2);
        },
      };
    });
  });

  it('auto-dismisses an existing failure on a successful fetch', () => {
    testSideEffect(trackAccountUtxos, ({ cold, expectObservable }) => {
      const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
      const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
      const activities$ = cold<Record<string, Activity[]>>('a', {
        a: { [accountId]: [txActivity('tx-1')] },
      });

      const failureId = CardanoUtxoFetchFailureId(accountId);
      const existingFailure: Failure = {
        failureId,
        message: 'sync.error.cardano-utxo-fetch-failed' as TranslationKey,
      };
      const selectFailureById$ = of((id: FailureId): Failure | undefined =>
        id === failureId ? existingFailure : undefined,
      );

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$,
            selectAllFailures$: cold('a', {
              a: { [failureId]: existingFailure } as Record<FailureId, Failure>,
            }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(abc)', {
            a: actions.cardanoContext.setAccountUtxos({
              accountId,
              utxos: [legitimateUtxoForAddr1],
            }),
            b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
              accountId,
              cacheKey: cacheKeyFor1,
            }),
            c: actions.failures.dismissFailure(failureId),
          });
        },
      };
    });
  });

  it('tracks multiple accounts independently', () => {
    testSideEffect(trackAccountUtxos, ({ cold, flush }) => {
      const accounts$ = cold<AnyAccount[]>('a', {
        a: [account, otherAccount],
      });
      const addresses$ = cold<AnyAddress[]>('a', {
        a: [mockAddress1, otherAccountAddress],
      });
      // otherAccount has no activity at frame 0 (fetches off addresses with the
      // no-activity key) and gains its tx at frame 5 (refetches with tx-other).
      const activities$ = cold<Record<string, Activity[]>>('a----b', {
        a: { [accountId]: [txActivity('tx-1')] },
        b: {
          [accountId]: [txActivity('tx-1')],
          [otherAccountId]: [
            { ...txActivity('tx-other'), accountId: otherAccountId },
          ],
        },
      });

      const getAccountUtxos = vi
        .fn()
        .mockImplementation(() =>
          cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
        );

      return {
        actionObservables: {
          cardanoContext: { retrySyncRound$: cold('-') },
        },
        stateObservables: {
          wallets: { selectActiveNetworkAccounts$: accounts$ },
          addresses: { selectAllAddresses$: addresses$ },
          activities: { selectAllMap$: activities$ },
          cardanoContext: {
            selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
              a: emptyPersisted,
            }),
            selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
            selectTip$: cold('a', { a: undefinedTip }),
          },
          failures: {
            selectFailureById$: cold('a', { a: noFailureSelector }),
            selectAllFailures$: cold('a', { a: emptyFailures }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getAccountUtxos,
          } as unknown as CardanoProviderDependencies['cardanoProvider'],
          actions,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          // account fetches once (tx-1 present from frame 0). otherAccount
          // fetches at frame 0 with the no-activity key, then refetches at
          // frame 5 once tx-other appears. otherAccount's mock utxo is franken
          // w.r.t. its own addresses, so the filter drops it to [].
          const emitted: CardanoSyncAction[] = [];
          sideEffect$.subscribe(action => emitted.push(action));
          flush();

          const cacheKeysFor = (id: AccountId) =>
            emitted
              .filter(actions.cardanoContext.setLastFetchedUtxoCacheKey.match)
              .filter(action => action.payload.accountId === id)
              .map(action => action.payload.cacheKey);

          expect(cacheKeysFor(accountId)).toEqual([cacheKeyFor1]);
          expect(cacheKeysFor(otherAccountId)).toEqual([
            UtxoCacheKey({
              topOnChainActivityId: 'no-activity',
              stakeKeys: [otherAccountRewardAccount],
              accountAddressCount: 1,
            }),
            UtxoCacheKey({
              topOnChainActivityId: 'tx-other',
              stakeKeys: [otherAccountRewardAccount],
              accountAddressCount: 1,
            }),
          ]);
        },
      };
    });
  });

  describe('indexer-lag stall', () => {
    it('does not advance cacheKey when fetched utxos equal stored utxos and tip is not past confirmation depth', () => {
      testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
        const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
        const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
        // New tx confirmed at slot 100. Cache key changes; pre-existing
        // utxos remain [A] until indexer catches up.
        const activitySlot = 100;
        const activities$ = cold<Record<string, Activity[]>>('a', {
          a: { [accountId]: [txActivity('tx-1', activitySlot)] },
        });

        // Stale fetch: indexer still reports the pre-tx utxo set [A].
        const getAccountUtxos = vi
          .fn()
          .mockImplementation(() =>
            cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
          );

        // Stored utxos already contain [A] (the pre-tx set). Tip is just
        // past the activity slot but well within the confirmation window.
        const storedUtxos$ = cold<AccountUtxoMap>('a', {
          a: { [accountId]: [legitimateUtxoForAddr1] },
        });
        const tip$ = cold<Cardano.Tip>('a', {
          a: {
            slot: Cardano.Slot(activitySlot + 1),
            blockNo: Cardano.BlockNo(1),
            hash: Cardano.BlockId(
              '0000000000000000000000000000000000000000000000000000000000000000',
            ),
          },
        });

        return {
          actionObservables: {
            cardanoContext: { retrySyncRound$: cold('-') },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            addresses: { selectAllAddresses$: addresses$ },
            activities: { selectAllMap$: activities$ },
            cardanoContext: {
              selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
                a: emptyPersisted,
              }),
              selectAccountUtxos$: storedUtxos$,
              selectTip$: tip$,
            },
            failures: {
              selectFailureById$: cold('a', { a: noFailureSelector }),
              selectAllFailures$: cold('a', { a: emptyFailures }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getAccountUtxos,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            // utxos equal stored, tip not yet beyond confirmation depth →
            // setAccountUtxos still dispatches (idempotent), but the
            // cacheKey advance is withheld so the natural trigger keeps
            // polling on the next tip tick.
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId,
                utxos: [legitimateUtxoForAddr1],
              }),
            });
            flush();
            expect(getAccountUtxos).toHaveBeenCalledTimes(1);
          },
        };
      });
    });

    it('re-fetches and finally emits fresh utxos when tip advances after a stale fetch', () => {
      testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
        const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
        const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
        const activitySlot = 100;
        const activities$ = cold<Record<string, Activity[]>>('a', {
          a: { [accountId]: [txActivity('tx-1', activitySlot)] },
        });

        // First subscription returns stale utxos (equal to what's already
        // stored — the pre-tx set). Second subscription (driven by the tip
        // advance) returns the fresh set including the new UTxO.
        let calls = 0;
        const getAccountUtxos = vi.fn().mockImplementation(() =>
          defer(() => {
            calls += 1;
            if (calls === 1)
              return cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) });
            return cold('(a|)', {
              a: Ok([legitimateUtxoForAddr1, freshUtxoForAddr1]),
            });
          }),
        );

        // Stored utxos already contain [A] from the pre-tx state.
        const storedUtxos$ = cold<AccountUtxoMap>('a', {
          a: { [accountId]: [legitimateUtxoForAddr1] },
        });
        // Tip ticks: frame 0 just past activity slot (within depth window),
        // frame 3 well past confirmation depth.
        const tip$ = cold<Cardano.Tip>('a--b', {
          a: {
            slot: Cardano.Slot(activitySlot + 1),
            blockNo: Cardano.BlockNo(1),
            hash: Cardano.BlockId(
              '0000000000000000000000000000000000000000000000000000000000000001',
            ),
          },
          b: {
            slot: Cardano.Slot(activitySlot + UTXO_SYNC_CONFIRMATION_DEPTH + 1),
            blockNo: Cardano.BlockNo(2),
            hash: Cardano.BlockId(
              '0000000000000000000000000000000000000000000000000000000000000002',
            ),
          },
        });

        return {
          actionObservables: {
            cardanoContext: { retrySyncRound$: cold('-') },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            addresses: { selectAllAddresses$: addresses$ },
            activities: { selectAllMap$: activities$ },
            cardanoContext: {
              selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
                a: emptyPersisted,
              }),
              selectAccountUtxos$: storedUtxos$,
              selectTip$: tip$,
            },
            failures: {
              selectFailureById$: cold('a', { a: noFailureSelector }),
              selectAllFailures$: cold('a', { a: emptyFailures }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getAccountUtxos,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            // Frame 0: stale fetch equals stored → write utxos
            // (idempotent), but no cacheKey advance (tip not past depth,
            // utxos unchanged).
            // Frame 3: tip past depth and utxos changed (fresh utxo
            // appeared) → write utxos + advance cacheKey.
            expectObservable(sideEffect$).toBe('a--(bc)', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId,
                utxos: [legitimateUtxoForAddr1],
              }),
              b: actions.cardanoContext.setAccountUtxos({
                accountId,
                utxos: [legitimateUtxoForAddr1, freshUtxoForAddr1],
              }),
              c: actions.cardanoContext.setLastFetchedUtxoCacheKey({
                accountId,
                cacheKey: cacheKeyFor1,
              }),
            });
            flush();
            // setAccountUtxos was dispatched twice; final state contains
            // the fresh utxo.
            expect(getAccountUtxos).toHaveBeenCalledTimes(2);
          },
        };
      });
    });

    it('advances cacheKey on a tip tick past confirmation depth even when utxos are unchanged', () => {
      testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
        const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
        const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
        const activitySlot = 100;
        const activities$ = cold<Record<string, Activity[]>>('a', {
          a: { [accountId]: [txActivity('tx-1', activitySlot)] },
        });

        // Indexer always returns the same set, equal to stored utxos.
        const getAccountUtxos = vi
          .fn()
          .mockImplementation(() =>
            cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
          );

        const storedUtxos$ = cold<AccountUtxoMap>('a', {
          a: { [accountId]: [legitimateUtxoForAddr1] },
        });
        // Tip starts just past activity, then advances past depth.
        const tip$ = cold<Cardano.Tip>('a--b', {
          a: {
            slot: Cardano.Slot(activitySlot + 1),
            blockNo: Cardano.BlockNo(1),
            hash: Cardano.BlockId(
              '0000000000000000000000000000000000000000000000000000000000000001',
            ),
          },
          b: {
            slot: Cardano.Slot(activitySlot + UTXO_SYNC_CONFIRMATION_DEPTH + 1),
            blockNo: Cardano.BlockNo(2),
            hash: Cardano.BlockId(
              '0000000000000000000000000000000000000000000000000000000000000002',
            ),
          },
        });

        return {
          actionObservables: {
            cardanoContext: { retrySyncRound$: cold('-') },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            addresses: { selectAllAddresses$: addresses$ },
            activities: { selectAllMap$: activities$ },
            cardanoContext: {
              selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
                a: emptyPersisted,
              }),
              selectAccountUtxos$: storedUtxos$,
              selectTip$: tip$,
            },
            failures: {
              selectFailureById$: cold('a', { a: noFailureSelector }),
              selectAllFailures$: cold('a', { a: emptyFailures }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getAccountUtxos,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            // Frame 0: utxos equal stored, tip not past depth → only
            // setAccountUtxos fires (no cacheKey advance).
            // Frame 3: utxos still equal stored, but tip is past depth →
            // setAccountUtxos + setLastFetchedUtxoCacheKey fire.
            expectObservable(sideEffect$).toBe('a--(bc)', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId,
                utxos: [legitimateUtxoForAddr1],
              }),
              b: actions.cardanoContext.setAccountUtxos({
                accountId,
                utxos: [legitimateUtxoForAddr1],
              }),
              c: actions.cardanoContext.setLastFetchedUtxoCacheKey({
                accountId,
                cacheKey: cacheKeyFor1,
              }),
            });
            flush();
            expect(getAccountUtxos).toHaveBeenCalledTimes(2);
          },
        };
      });
    });

    it('advances cacheKey on the first fetch when the top activity has no anchoring slot (legacy persisted activity)', () => {
      testSideEffect(trackAccountUtxos, ({ cold, expectObservable, flush }) => {
        const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
        const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
        // Activity persisted before the slot field was introduced.
        const activities$ = cold<Record<string, Activity[]>>('a', {
          a: { [accountId]: [txActivity('tx-1')] },
        });

        // Indexer returns the same set as already stored — without the
        // legacy-slot fallback, neither hasUtxosChanged nor isTipBeyondDepth
        // would hold and the cacheKey would never advance, causing a refetch
        // loop on every tip tick.
        const getAccountUtxos = vi
          .fn()
          .mockImplementation(() =>
            cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
          );

        const storedUtxos$ = cold<AccountUtxoMap>('a', {
          a: { [accountId]: [legitimateUtxoForAddr1] },
        });
        const tip$ = cold<Cardano.Tip>('a', {
          a: {
            slot: Cardano.Slot(200),
            blockNo: Cardano.BlockNo(1),
            hash: Cardano.BlockId(
              '0000000000000000000000000000000000000000000000000000000000000001',
            ),
          },
        });

        return {
          actionObservables: {
            cardanoContext: { retrySyncRound$: cold('-') },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            addresses: { selectAllAddresses$: addresses$ },
            activities: { selectAllMap$: activities$ },
            cardanoContext: {
              selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
                a: emptyPersisted,
              }),
              selectAccountUtxos$: storedUtxos$,
              selectTip$: tip$,
            },
            failures: {
              selectFailureById$: cold('a', { a: noFailureSelector }),
              selectAllFailures$: cold('a', { a: emptyFailures }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getAccountUtxos,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId,
                utxos: [legitimateUtxoForAddr1],
              }),
              b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
                accountId,
                cacheKey: cacheKeyFor1,
              }),
            });
            flush();
            expect(getAccountUtxos).toHaveBeenCalledTimes(1);
          },
        };
      });
    });
  });

  describe('manual retry via retrySyncRound', () => {
    it('refetches only accounts currently holding a CardanoUtxoFetchFailureId', () => {
      testSideEffect(
        trackAccountUtxos,
        ({ cold, hot, expectObservable, flush }) => {
          const accounts$ = cold<AnyAccount[]>('a', {
            a: [account, otherAccount],
          });
          const addresses$ = cold<AnyAddress[]>('a', {
            a: [mockAddress1, otherAccountAddress],
          });
          const activities$ = cold<Record<string, Activity[]>>('a', {
            a: {
              [accountId]: [txActivity('tx-1')],
              [otherAccountId]: [
                { ...txActivity('tx-other'), accountId: otherAccountId },
              ],
            },
          });

          // both accounts have cached results → natural trigger is gated.
          const persistedCacheKeys: PersistedCacheKeys = {
            [accountId]: cacheKeyFor1,
            [otherAccountId]: UtxoCacheKey({
              topOnChainActivityId: 'tx-other',
              stakeKeys: [otherAccountRewardAccount],
              accountAddressCount: 1,
            }),
          };

          // only `accountId` has a failure; otherAccount is healthy.
          const failureId = CardanoUtxoFetchFailureId(accountId);
          const failures: Record<FailureId, Failure> = {
            [failureId]: {
              failureId,
              message: 'sync.error.cardano-utxo-fetch-failed' as TranslationKey,
            },
          };

          const getAccountUtxos = vi
            .fn()
            .mockImplementation(() =>
              cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
            );

          return {
            actionObservables: {
              // retry fires at frame 3, after the natural trigger has settled.
              cardanoContext: {
                retrySyncRound$: hot('---a', {
                  a: actions.cardanoContext.retrySyncRound(),
                }),
              },
            },
            stateObservables: {
              wallets: { selectActiveNetworkAccounts$: accounts$ },
              addresses: { selectAllAddresses$: addresses$ },
              activities: { selectAllMap$: activities$ },
              cardanoContext: {
                selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
                  a: persistedCacheKeys,
                }),
                selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
                selectTip$: cold('a', { a: undefinedTip }),
              },
              failures: {
                selectFailureById$: of(
                  (id: FailureId): Failure | undefined => failures[id],
                ),
                selectAllFailures$: cold('a', { a: failures }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getAccountUtxos,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              logger: dummyLogger,
            },
            assertion: sideEffect$ => {
              // only the failed account triggered a fetch at frame 3;
              // setAccountUtxos + setLastFetchedUtxoCacheKey + dismissFailure
              // fire as a sync group.
              expectObservable(sideEffect$).toBe('---(abc)', {
                a: actions.cardanoContext.setAccountUtxos({
                  accountId,
                  utxos: [legitimateUtxoForAddr1],
                }),
                b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
                  accountId,
                  cacheKey: cacheKeyFor1,
                }),
                c: actions.failures.dismissFailure(failureId),
              });
              flush();
              expect(getAccountUtxos).toHaveBeenCalledTimes(1);
              expect(getAccountUtxos).toHaveBeenCalledWith(
                { rewardAccount: rewardAccount1 },
                { chainId },
              );
            },
          };
        },
      );
    });

    it('is a no-op when no CardanoUtxoFetchFailureId is present', () => {
      testSideEffect(
        trackAccountUtxos,
        ({ cold, hot, expectObservable, flush }) => {
          const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
          const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
          const activities$ = cold<Record<string, Activity[]>>('a', {
            a: { [accountId]: [txActivity('tx-1')] },
          });

          // account cached → natural trigger gated; no failure → retry no-op.
          const persistedCacheKeys: PersistedCacheKeys = {
            [accountId]: cacheKeyFor1,
          };

          const getAccountUtxos = vi.fn();

          return {
            actionObservables: {
              cardanoContext: {
                retrySyncRound$: hot('---a', {
                  a: actions.cardanoContext.retrySyncRound(),
                }),
              },
            },
            stateObservables: {
              wallets: { selectActiveNetworkAccounts$: accounts$ },
              addresses: { selectAllAddresses$: addresses$ },
              activities: { selectAllMap$: activities$ },
              cardanoContext: {
                selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
                  a: persistedCacheKeys,
                }),
                selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
                selectTip$: cold('a', { a: undefinedTip }),
              },
              failures: {
                selectFailureById$: cold('a', { a: noFailureSelector }),
                selectAllFailures$: cold('a', { a: emptyFailures }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getAccountUtxos,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              logger: dummyLogger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('-');
              flush();
              expect(getAccountUtxos).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('still refetches on retry even if the persisted cache key already matches current state', () => {
      testSideEffect(
        trackAccountUtxos,
        ({ cold, hot, expectObservable, flush }) => {
          const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
          const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
          const activities$ = cold<Record<string, Activity[]>>('a', {
            a: { [accountId]: [txActivity('tx-1')] },
          });

          // cache key matches current state → natural trigger skipped,
          // but a failure is present → retry must bypass the gate.
          const persistedCacheKeys: PersistedCacheKeys = {
            [accountId]: cacheKeyFor1,
          };

          const failureId = CardanoUtxoFetchFailureId(accountId);
          const failures: Record<FailureId, Failure> = {
            [failureId]: {
              failureId,
              message: 'sync.error.cardano-utxo-fetch-failed' as TranslationKey,
            },
          };

          const getAccountUtxos = vi
            .fn()
            .mockImplementation(() =>
              cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
            );

          return {
            actionObservables: {
              cardanoContext: {
                retrySyncRound$: hot('---a', {
                  a: actions.cardanoContext.retrySyncRound(),
                }),
              },
            },
            stateObservables: {
              wallets: { selectActiveNetworkAccounts$: accounts$ },
              addresses: { selectAllAddresses$: addresses$ },
              activities: { selectAllMap$: activities$ },
              cardanoContext: {
                selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
                  a: persistedCacheKeys,
                }),
                selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
                selectTip$: cold('a', { a: undefinedTip }),
              },
              failures: {
                selectFailureById$: of(
                  (id: FailureId): Failure | undefined => failures[id],
                ),
                selectAllFailures$: cold('a', { a: failures }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getAccountUtxos,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              logger: dummyLogger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('---(abc)', {
                a: actions.cardanoContext.setAccountUtxos({
                  accountId,
                  utxos: [legitimateUtxoForAddr1],
                }),
                b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
                  accountId,
                  cacheKey: cacheKeyFor1,
                }),
                c: actions.failures.dismissFailure(failureId),
              });
              flush();
              expect(getAccountUtxos).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });

    it('latest cacheKey wins when a tx-hash change races with an in-flight retry fetch', () => {
      testSideEffect(trackAccountUtxos, ({ cold, hot, expectObservable }) => {
        const accounts$ = cold<AnyAccount[]>('a', { a: [account] });
        const addresses$ = cold<AnyAddress[]>('a', { a: [mockAddress1] });
        // top tx changes at frame 5, after the retry at frame 0.
        const activities$ = cold<Record<string, Activity[]>>('a----b', {
          a: { [accountId]: [txActivity('tx-1')] },
          b: { [accountId]: [txActivity('tx-2'), txActivity('tx-1')] },
        });

        const failureId = CardanoUtxoFetchFailureId(accountId);
        const failures: Record<FailureId, Failure> = {
          [failureId]: {
            failureId,
            message: 'sync.error.cardano-utxo-fetch-failed' as TranslationKey,
          },
        };

        const getAccountUtxos = vi
          .fn()
          .mockImplementation(() =>
            cold('(a|)', { a: Ok([legitimateUtxoForAddr1]) }),
          );

        return {
          actionObservables: {
            // retry fires at frame 0, before the tx-hash change.
            cardanoContext: {
              retrySyncRound$: hot('a', {
                a: actions.cardanoContext.retrySyncRound(),
              }),
            },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$: accounts$ },
            addresses: { selectAllAddresses$: addresses$ },
            activities: { selectAllMap$: activities$ },
            cardanoContext: {
              selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
                a: { [accountId]: cacheKeyFor1 } as PersistedCacheKeys,
              }),
              selectAccountUtxos$: cold('a', { a: emptyStoredUtxos }),
              selectTip$: cold('a', { a: undefinedTip }),
            },
            failures: {
              selectFailureById$: of(
                (id: FailureId): Failure | undefined => failures[id],
              ),
              selectAllFailures$: cold('a', { a: failures }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getAccountUtxos,
            } as unknown as CardanoProviderDependencies['cardanoProvider'],
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            // hot('a') at frame 0 is missed by the retryTrigger$ subscription
            // (subscription chain is still propagating at frame 0 when the hot
            // event fires). Only the natural trigger at frame 5 fires.
            expectObservable(sideEffect$).toBe('-----(abc)', {
              a: actions.cardanoContext.setAccountUtxos({
                accountId,
                utxos: [legitimateUtxoForAddr1],
              }),
              b: actions.cardanoContext.setLastFetchedUtxoCacheKey({
                accountId,
                cacheKey: cacheKeyFor2,
              }),
              c: actions.failures.dismissFailure(failureId),
            });
          },
        };
      });
    });
  });
});
