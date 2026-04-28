import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, Err, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src';
import { CardanoRewardAccount, CardanoPaymentAddress } from '../../../src';
import { createTrackAccountRewardsHistory } from '../../../src/store/side-effects/track-account-reward-history';
import { account0Context, cardanoAccount0Addr, chainId } from '../../mocks';

import type {
  CardanoAddressData,
  CardanoProvider,
  CardanoRewardAccountToRewardMap,
} from '../../../src';
import type { AnyAddress } from '@lace-contract/addresses';

const actions = {
  ...cardanoContextActions,
};

const accountId1 = account0Context.accountId;
const accountId2 = AccountId('test-account-2');
const accountId3 = AccountId('test-account-3');

const rewardAccount1 = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);
const rewardAccount2 = CardanoRewardAccount(
  'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
);
const rewardAccount3 = CardanoRewardAccount(
  'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx',
);
const rewardAccount4 = CardanoRewardAccount(
  'stake_test1uqwpjwg2y0qaclsr6dcvu6qk4s0ek9vpkurcmt99ktcv5ug079h55',
);

const mockAddress1: AnyAddress = {
  ...cardanoAccount0Addr,
  data: {
    rewardAccount: rewardAccount1,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  } as CardanoAddressData,
};

const mockAddress2: AnyAddress = {
  address: CardanoPaymentAddress(
    'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
  ),
  accountId: accountId2,
  blockchainName: 'Cardano',
  data: {
    rewardAccount: rewardAccount2,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  } as CardanoAddressData,
};

const mockAddress3: AnyAddress = {
  address: CardanoPaymentAddress(
    'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
  ),
  accountId: accountId3,
  blockchainName: 'Cardano',
  data: {
    rewardAccount: rewardAccount3,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  } as CardanoAddressData,
};

const mockAddress4: AnyAddress = {
  address: CardanoPaymentAddress(
    'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g',
  ),
  accountId: accountId3,
  blockchainName: 'Cardano',
  data: {
    rewardAccount: rewardAccount4,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  } as CardanoAddressData,
};

const mockRewards1 = [
  {
    epoch: Cardano.EpochNo(100),
    rewards: BigNumber(BigInt('1000')),
    poolId: Cardano.PoolId(
      'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
    ),
  },
];

const mockRewards2 = [
  {
    epoch: Cardano.EpochNo(101),
    rewards: BigNumber(BigInt('2000')),
    poolId: Cardano.PoolId(
      'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
    ),
  },
];

const mockRewards3 = [
  {
    epoch: Cardano.EpochNo(102),
    rewards: BigNumber(BigInt('3000')),
    poolId: Cardano.PoolId(
      'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
    ),
  },
];

const providerError = new ProviderError(ProviderFailure.Unhealthy);

describe('createTrackAccountRewardsHistory', () => {
  const trackAccountRewardsHistory = createTrackAccountRewardsHistory(0);

  it('fetches and dispatches rewards history on address or chain change', () => {
    const getAccountRewards = vi.fn().mockReturnValue(of(Ok(mockRewards1)));
    const rewardsHistory: CardanoRewardAccountToRewardMap = {
      [rewardAccount1]: mockRewards1,
    };

    testSideEffect(
      trackAccountRewardsHistory,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: { selectAllAddresses$: cold('a', { a: [mockAddress1] }) },
          cardanoContext: { selectChainId$: cold('a', { a: chainId }) },
        },
        dependencies: {
          cardanoProvider: { getAccountRewards } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setAccountRewardsHistory({
              accountId: accountId1,
              rewardsHistory,
            }),
          });
        },
      }),
    );
  });

  it('handles multiple accounts with different reward account configurations', () => {
    const getAccountRewards = vi
      .fn()
      .mockImplementation(({ rewardAccount }) => {
        if (rewardAccount === rewardAccount1) return of(Ok(mockRewards1));
        if (rewardAccount === rewardAccount3) return of(Ok(mockRewards2));
        if (rewardAccount === rewardAccount4) return of(Ok(mockRewards3));
        return of(Ok([]));
      });

    testSideEffect(
      trackAccountRewardsHistory,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', {
              a: [mockAddress1, mockAddress3, mockAddress4],
            }),
          },
          cardanoContext: { selectChainId$: cold('a', { a: chainId }) },
        },
        dependencies: {
          cardanoProvider: { getAccountRewards } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountRewardsHistory({
              accountId: accountId1,
              rewardsHistory: {
                [rewardAccount1]: mockRewards1,
              },
            }),
            b: actions.cardanoContext.setAccountRewardsHistory({
              accountId: accountId3,
              rewardsHistory: {
                [rewardAccount3]: mockRewards2,
                [rewardAccount4]: mockRewards3,
              },
            }),
          });
        },
      }),
    );
  });

  it('handles partial failures when some reward accounts fail to load', () => {
    const getAccountRewards = vi
      .fn()
      .mockImplementation(({ rewardAccount }) => {
        if (rewardAccount === rewardAccount1) return of(Ok(mockRewards1));
        if (rewardAccount === rewardAccount3) return of(Err(providerError));
        if (rewardAccount === rewardAccount4) return of(Ok(mockRewards3));
        return of(Ok([]));
      });

    testSideEffect(
      trackAccountRewardsHistory,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', {
              a: [mockAddress1, mockAddress3, mockAddress4],
            }),
          },
          cardanoContext: { selectChainId$: cold('a', { a: chainId }) },
        },
        dependencies: {
          cardanoProvider: { getAccountRewards } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setAccountRewardsHistory({
              accountId: accountId1,
              rewardsHistory: {
                [rewardAccount1]: mockRewards1,
              },
            }),
            b: actions.cardanoContext.getAccountRewardsHistoryFailed({
              accountId: accountId3,
              failure: providerError.reason,
            }),
          });
        },
      }),
    );
  });

  it('dispatches a failure action when the provider fails', () => {
    const getAccountRewards = vi.fn().mockReturnValue(of(Err(providerError)));

    testSideEffect(
      trackAccountRewardsHistory,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: { selectAllAddresses$: cold('a', { a: [mockAddress1] }) },
          cardanoContext: { selectChainId$: cold('a', { a: chainId }) },
        },
        dependencies: {
          cardanoProvider: { getAccountRewards } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.getAccountRewardsHistoryFailed({
              accountId: accountId1,
              failure: providerError.reason,
            }),
          });
        },
      }),
    );
  });

  it('does nothing if addresses have no reward accounts', () => {
    const addressWithoutRewardAccount = {
      ...mockAddress1,
      data: { rewardAccount: undefined },
    };
    const getAccountRewards = vi.fn();

    testSideEffect(
      trackAccountRewardsHistory,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', {
              a: [addressWithoutRewardAccount],
            }),
          },
          cardanoContext: { selectChainId$: cold('a', { a: chainId }) },
        },
        dependencies: {
          cardanoProvider: { getAccountRewards } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      }),
    );
  });

  it('debounces rapid changes and processes only the last one', () => {
    const debouncedSideEffect = createTrackAccountRewardsHistory(20);
    const getAccountRewards = vi.fn().mockReturnValue(of(Ok(mockRewards1)));
    const rewardsHistory = { [rewardAccount1]: mockRewards1 };

    testSideEffect(debouncedSideEffect, ({ cold, expectObservable }) => ({
      stateObservables: {
        addresses: {
          selectAllAddresses$: cold('ab', {
            a: [mockAddress2],
            b: [mockAddress1],
          }),
        },
        cardanoContext: { selectChainId$: cold('a', { a: chainId }) },
      },
      dependencies: {
        cardanoProvider: { getAccountRewards } as unknown as CardanoProvider,
        actions,
      },
      assertion: sideEffect$ => {
        const expectedMarble = '21ms a';
        expectObservable(sideEffect$).toBe(expectedMarble, {
          a: actions.cardanoContext.setAccountRewardsHistory({
            accountId: accountId1,
            rewardsHistory,
          }),
        });
      },
    }));
  });
});
