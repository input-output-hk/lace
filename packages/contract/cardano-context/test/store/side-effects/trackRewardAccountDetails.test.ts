import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, Err, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { cardanoContextActions } from '../../../src';
import { CardanoRewardAccount, CardanoPaymentAddress } from '../../../src';
import { trackRewardAccountDetails } from '../../../src/store/side-effects/track-reward-account-details';
import { account0Context, cardanoAccount0Addr, chainId } from '../../mocks';

import type { CardanoProvider } from '../../../src';
import type { RewardAccountDetails } from '../../../src/types';
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
  },
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
  },
};

const mockRewardAccountInfo1 = {
  isActive: true,
  isRegistered: true,
  rewardsSum: BigNumber(100_000_000n),
  withdrawableAmount: BigNumber(100_000_000n),
  controlledAmount: BigNumber(500_000_000n),
};

const mockRewardAccountInfo2 = {
  isActive: false,
  isRegistered: false,
  rewardsSum: BigNumber(50_000_000n),
  withdrawableAmount: BigNumber(50_000_000n),
  controlledAmount: BigNumber(250_000_000n),
};

const mockDetails1: RewardAccountDetails = {
  rewardAccountInfo: mockRewardAccountInfo1,
};

const mockDetails2: RewardAccountDetails = {
  rewardAccountInfo: mockRewardAccountInfo2,
};

const providerError = new ProviderError(ProviderFailure.Unhealthy);

describe('trackRewardAccountDetails', () => {
  it('re-fetches details for all accounts when any transaction count changes', () => {
    const getRewardAccountInfo = vi
      .fn()
      .mockImplementation(({ rewardAccount }) => {
        if (rewardAccount === rewardAccount1)
          return of(Ok(mockRewardAccountInfo1));
        if (rewardAccount === rewardAccount2)
          return of(Ok(mockRewardAccountInfo2));
        return of(Ok(mockRewardAccountInfo1));
      });

    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => ({
      stateObservables: {
        addresses: {
          selectAllAddresses$: cold('a', {
            a: [mockAddress1, mockAddress2],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectAccountTransactionsTotal$: cold('a-------b-------c', {
            a: { [accountId1]: 5, [accountId2]: 10 },
            b: { [accountId1]: 6, [accountId2]: 10 },
            c: { [accountId1]: 6, [accountId2]: 11 },
          }),
        },
      },
      dependencies: {
        cardanoProvider: {
          getRewardAccountInfo,
        } as unknown as CardanoProvider,
        actions,
      },
      assertion: sideEffect$ => {
        // switchMap re-creates all per-account streams on every emission,
        // so ALL accounts are fetched each time (not just the changed ones).
        // This ensures restored accounts (with the same IDs) are properly synced.
        expectObservable(sideEffect$).toBe('(ab)----(ab)----(ab)', {
          a: actions.cardanoContext.setRewardAccountDetails({
            accountId: accountId1,
            details: mockDetails1,
          }),
          b: actions.cardanoContext.setRewardAccountDetails({
            accountId: accountId2,
            details: mockDetails2,
          }),
        });
      },
    }));
  });

  it('dispatches failed action when getRewardAccountInfo fails', () => {
    const getRewardAccountInfo = vi
      .fn()
      .mockReturnValue(of(Err(providerError)));

    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => ({
      stateObservables: {
        addresses: { selectAllAddresses$: cold('a', { a: [mockAddress1] }) },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectAccountTransactionsTotal$: cold('a', {
            a: { [accountId1]: 10 },
          }),
        },
      },
      dependencies: {
        cardanoProvider: {
          getRewardAccountInfo,
        } as unknown as CardanoProvider,
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.cardanoContext.getRewardAccountDetailsFailed({
            accountId: accountId1,
            rewardAccount: rewardAccount1,
            chainId,
            failure: providerError.reason,
          }),
        });
      },
    }));
  });

  it('does nothing if addresses have no reward accounts', () => {
    const addressWithoutRewardAccount = {
      ...mockAddress1,
      data: { rewardAccount: undefined },
    };
    const getRewardAccountInfo = vi.fn();

    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => ({
      stateObservables: {
        addresses: {
          selectAllAddresses$: cold('a', {
            a: [addressWithoutRewardAccount],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectAccountTransactionsTotal$: cold('a', {
            a: { [accountId1]: 10 },
          }),
        },
      },
      dependencies: {
        cardanoProvider: {
          getRewardAccountInfo,
        } as unknown as CardanoProvider,
        actions,
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-');
      },
    }));
  });

  it('fetches only first stake key when account has multiple', () => {
    // Single account with TWO addresses having different stake keys
    const address1 = mockAddress1;
    const address2 = {
      ...mockAddress2,
      accountId: accountId1, // Same account as address1
      data: {
        ...(mockAddress2.data ?? {}),
        rewardAccount: rewardAccount2, // Different stake key
      },
    };

    const getRewardAccountInfo = vi
      .fn()
      .mockImplementation(({ rewardAccount }) => {
        if (rewardAccount === rewardAccount1)
          return of(Ok(mockRewardAccountInfo1));
        if (rewardAccount === rewardAccount2)
          return of(Ok(mockRewardAccountInfo2));
        return of(Ok(mockRewardAccountInfo1));
      });

    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => ({
        stateObservables: {
          addresses: {
            selectAllAddresses$: cold('a', { a: [address1, address2] }),
          },
          cardanoContext: {
            selectChainId$: cold('a', { a: chainId }),
            selectAccountTransactionsTotal$: cold('a', {
              a: { [accountId1]: 5 },
            }),
          },
        },
        dependencies: {
          cardanoProvider: {
            getRewardAccountInfo,
          } as unknown as CardanoProvider,
          actions,
        },
        assertion: sideEffect$ => {
          // Only first stake key is fetched
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId: accountId1,
              details: mockDetails1,
            }),
          });

          flush();
          // Verify only called once (first stake key only)
          expect(getRewardAccountInfo).toHaveBeenCalledTimes(1);
        },
      }),
    );
  });

  it('cancels in-flight fetches on rapid updates via switchMap', () => {
    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => {
        const getRewardAccountInfo = vi.fn().mockImplementation(() => {
          // Each fetch takes 3 frames
          return cold('---a|', { a: Ok(mockRewardAccountInfo1) });
        });

        return {
          stateObservables: {
            addresses: {
              selectAllAddresses$: cold('a', { a: [mockAddress1] }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              // Rapid updates: 5 at frame 0, 6 at frame 1, 7 at frame 2
              selectAccountTransactionsTotal$: cold('abc', {
                a: { [accountId1]: 5 },
                b: { [accountId1]: 6 },
                c: { [accountId1]: 7 },
              }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getRewardAccountInfo,
            } as unknown as CardanoProvider,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-----a', {
              a: actions.cardanoContext.setRewardAccountDetails({
                accountId: accountId1,
                details: mockDetails1,
              }),
            });

            flush();
            // switchMap subscribes to the fetch each time (3 calls), but cancels the first 2
            expect(getRewardAccountInfo).toHaveBeenCalledTimes(3);
          },
        };
      },
    );
  });

  it('processes multiple accounts concurrently', () => {
    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => {
        const getRewardAccountInfo = vi
          .fn()
          .mockImplementation(({ rewardAccount }) => {
            const delay = '---a|';
            if (rewardAccount === rewardAccount1) {
              return cold(delay, { a: Ok(mockRewardAccountInfo1) });
            }
            if (rewardAccount === rewardAccount2) {
              return cold(delay, { a: Ok(mockRewardAccountInfo2) });
            }
            return of(Ok(mockRewardAccountInfo1));
          });

        return {
          stateObservables: {
            addresses: {
              selectAllAddresses$: cold('a', {
                a: [mockAddress1, mockAddress2],
              }),
            },
            cardanoContext: {
              selectChainId$: cold('a', { a: chainId }),
              selectAccountTransactionsTotal$: cold('a', {
                a: { [accountId1]: 5, [accountId2]: 10 },
              }),
            },
          },
          dependencies: {
            cardanoProvider: {
              getRewardAccountInfo,
            } as unknown as CardanoProvider,
            actions,
          },
          assertion: sideEffect$ => {
            // Both complete at the same time (concurrent processing)
            // Fetch takes 3 frames (---a|), so emissions at frame 3
            expectObservable(sideEffect$).toBe('---(ab)', {
              a: actions.cardanoContext.setRewardAccountDetails({
                accountId: accountId1,
                details: mockDetails1,
              }),
              b: actions.cardanoContext.setRewardAccountDetails({
                accountId: accountId2,
                details: mockDetails2,
              }),
            });

            flush();
            expect(getRewardAccountInfo).toHaveBeenCalledTimes(2);
          },
        };
      },
    );
  });
});
