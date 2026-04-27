import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src';
import { CardanoRewardAccount, CardanoPaymentAddress } from '../../../src';
import { trackAccountTransactionsTotal } from '../../../src/store/side-effects/track-account-transactions-total';
import {
  account0Context,
  cardanoAccount0Addr,
  chainId,
  tip1,
  tip2,
} from '../../mocks';

import type { CardanoAddressData, CardanoProvider } from '../../../src';
import type { AnyAddress } from '@lace-contract/addresses';

const actions = {
  ...cardanoContextActions,
};

const accountId1 = account0Context.accountId;
const accountId2 = AccountId('test-account-2');

const rewardAccount1 = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);
const rewardAccount2 = CardanoRewardAccount(
  'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
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

const providerError = new ProviderError(ProviderFailure.Unhealthy);

describe('trackAccountTransactionsTotal', () => {
  it('fetches transaction totals for multiple accounts and re-fetches on tip changes', () => {
    const getTotalAccountTransactionCount = vi
      .fn()
      .mockImplementation(({ rewardAccount }) => {
        if (rewardAccount === rewardAccount1) return of(Ok(10));
        if (rewardAccount === rewardAccount2) return of(Ok(20));
        return of(Ok(0));
      });

    testSideEffect(
      trackAccountTransactionsTotal,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', {
              a: [mockAddress1, mockAddress2],
            }),
          },
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectTip$: cold('a---b', {
              a: tip1,
              b: tip2,
            }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getTotalAccountTransactionCount,
          } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)(cd)', {
            a: actions.cardanoContext.setAccountTransactionsTotal({
              accountId: accountId1,
              total: 10,
            }),
            b: actions.cardanoContext.setAccountTransactionsTotal({
              accountId: accountId2,
              total: 20,
            }),
            c: actions.cardanoContext.setAccountTransactionsTotal({
              accountId: accountId1,
              total: 10,
            }),
            d: actions.cardanoContext.setAccountTransactionsTotal({
              accountId: accountId2,
              total: 20,
            }),
          });
        },
      }),
    );
  });

  it('dispatches failed action when provider fails', () => {
    const getTotalAccountTransactionCount = vi
      .fn()
      .mockReturnValue(of(Err(providerError)));

    testSideEffect(
      trackAccountTransactionsTotal,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: { selectAllAddresses$: cold('a', { a: [mockAddress1] }) },
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectTip$: cold('a', { a: tip1 }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getTotalAccountTransactionCount,
          } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.getAccountTransactionsTotalFailed({
              accountId: accountId1,
              chainId,
              failure: providerError.reason,
            }),
          });
        },
      }),
    );
  });

  it('handles multiple accounts where some have no reward accounts', () => {
    const addressWithoutRewardAccount = {
      ...mockAddress1,
      accountId: AccountId('no-reward-account'),
      data: { rewardAccount: undefined },
    };
    const getTotalAccountTransactionCount = vi.fn().mockReturnValue(of(Ok(30)));

    testSideEffect(
      trackAccountTransactionsTotal,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', {
              a: [addressWithoutRewardAccount, mockAddress1],
            }),
          },
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectTip$: cold('a', { a: tip1 }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getTotalAccountTransactionCount,
          } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setAccountTransactionsTotal({
              accountId: accountId1,
              total: 30,
            }),
          });
        },
      }),
    );
  });

  it('handles zero transaction count', () => {
    const getTotalAccountTransactionCount = vi.fn().mockReturnValue(of(Ok(0)));

    testSideEffect(
      trackAccountTransactionsTotal,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          addresses: { selectAllAddresses$: cold('a', { a: [mockAddress1] }) },
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectTip$: cold('a', { a: tip1 }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getTotalAccountTransactionCount,
          } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setAccountTransactionsTotal({
              accountId: accountId1,
              total: 0,
            }),
          });
        },
      }),
    );
  });
});
