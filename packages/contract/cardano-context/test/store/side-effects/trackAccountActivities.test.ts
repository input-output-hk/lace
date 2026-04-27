import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, Err, Ok, Timestamp } from '@lace-sdk/util';
import { of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  ActivityKind,
  cardanoContextActions,
  RewardActivityId,
  CardanoRewardAccount,
  CardanoPaymentAddress,
} from '../../../src';
import { createTrackAccountActivities } from '../../../src/store/side-effects/track-account-activities';
import {
  account0Context,
  cardanoAccount0Addr,
  chainId,
  createTransactionHistoryItem,
} from '../../mocks';

import type {
  CardanoAccountToRewardsMap,
  CardanoAccountTransactionsHistoryMap,
  CardanoProviderDependencies,
  CardanoRewardActivity,
  ExtendedTxDetails,
  RequiredProtocolParameters,
} from '../../../src';
import type {
  MissingRewardData,
  MissingTransactionData,
} from '../../../src/store/helpers';
import type { Activity } from '@lace-contract/activities';

const actions = {
  ...activitiesActions,
  ...cardanoContextActions,
};

describe('cardano-context side effects', () => {
  const mockTxId =
    '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2';

  const rewardAccount0 = CardanoRewardAccount(
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
  );

  const cardanoAccount0AddrWithData = {
    ...cardanoAccount0Addr,
    data: {
      networkId: chainId.networkId,
      rewardAccount: rewardAccount0,
    },
  };

  describe('trackAccountActivities', () => {
    it('fetches activity details and dispatches insertActivities action', () => {
      const findMissingActivitiesMock = vi.fn();
      const mapTransactionToActivityMock = vi.fn();
      const mapRewardToActivityMock = vi.fn();
      const randomDebounceTimeout = Math.random() * 10;

      testSideEffect(
        createTrackAccountActivities({
          findMissingActivities: findMissingActivitiesMock,
          mapTransactionToActivity: mapTransactionToActivityMock,
          mapRewardToActivity: mapRewardToActivityMock,
          debounceTimeout: randomDebounceTimeout,
        }),
        ({ cold, expectObservable, flush }) => {
          const protocolParametersMock = {
            coinsPerUtxoByte: 4310,
          } as RequiredProtocolParameters;
          const allAddressesMock = [cardanoAccount0AddrWithData];

          // Mock history map with one transaction
          const transactionHistoryByAccountMock: CardanoAccountTransactionsHistoryMap =
            {
              [cardanoAccount0Addr.accountId]: [
                createTransactionHistoryItem({
                  id: mockTxId,
                  blockTime: Date.now(),
                }),
              ],
            };
          const selectTransactionHistoryGroupedByAccount$ = cold('a', {
            a: transactionHistoryByAccountMock,
          });

          // Mock rewards history with one reward
          const mockReward = {
            epoch: Cardano.EpochNo(100),
            rewards: BigNumber(BigInt('1000')),
            poolId: Cardano.PoolId(
              'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
            ),
          };
          const mockRewardActivity: CardanoRewardActivity = {
            accountId: cardanoAccount0AddrWithData.accountId,
            type: ActivityType.Rewards,
            activityId: RewardActivityId(
              mockReward,
              CardanoRewardAccount(
                cardanoAccount0AddrWithData.data.rewardAccount,
              ),
            ),
            timestamp: Timestamp(Date.now()),
            tokenBalanceChanges: [
              {
                tokenId: TokenId('lovelace'),
                amount: BigNumber(BigInt(mockReward.rewards)),
              },
            ],
          };
          const rewardsHistoryByAccountMock: CardanoAccountToRewardsMap = {
            [cardanoAccount0Addr.accountId]: [mockReward],
          };
          const selectRewardsHistoryGroupedByAccount$ = cold('a', {
            a: rewardsHistoryByAccountMock,
          });

          // Mock empty activities map
          const selectAllMap$ = cold('a', { a: {} });

          const txToLoadData: MissingTransactionData = {
            kind: ActivityKind.Transaction,
            timestamp: Timestamp(Date.now()),
            txId: Cardano.TransactionId(mockTxId),
            accountId: cardanoAccount0AddrWithData.accountId,
            rewardAccount: CardanoRewardAccount(
              cardanoAccount0AddrWithData.data.rewardAccount,
            ),
            accountAddresses: [
              CardanoPaymentAddress(cardanoAccount0AddrWithData.address),
            ],
          };

          const missingRewardActivityData: MissingRewardData = {
            kind: ActivityKind.Reward,
            timestamp: Timestamp(Date.now()),
            accountId: cardanoAccount0AddrWithData.accountId,
            rewardActivity: mockRewardActivity,
          };

          // Mock transaction to load
          findMissingActivitiesMock.mockReturnValue([
            txToLoadData,
            missingRewardActivityData,
          ]);

          const mockTxDetails = {
            id: Cardano.TransactionId(mockTxId),
          } as unknown as ExtendedTxDetails;

          // Mock transaction details result
          const getTransactionDetails = vi
            .fn()
            .mockReturnValue(of(Ok(mockTxDetails)));

          // Mock the account activity that would be produced
          const mockAccountActivity = {
            activityId: mockTxId,
          } as unknown as Activity;

          mapTransactionToActivityMock.mockReturnValue(
            of(Ok(mockAccountActivity)),
          );

          return {
            actionObservables: {},
            stateObservables: {
              addresses: {
                selectAllAddresses$: cold('a', {
                  a: allAddressesMock,
                }),
              },
              activities: {
                selectAllMap$,
                selectDesiredLoadedActivitiesCountPerAccount$: cold('a', {
                  a: {
                    [cardanoAccount0AddrWithData.accountId]: 10,
                  },
                }),
              },
              cardanoContext: {
                selectChainId$: cold('a', { a: chainId }),
                selectProtocolParameters$: cold('a', {
                  a: protocolParametersMock,
                }),
                selectEraSummaries$: cold('a', { a: [] }),
                selectTransactionHistoryGroupedByAccount$,
                selectRewardsHistoryGroupedByAccount$,
              },
            },
            dependencies: {
              cardanoProvider: {
                getTransactionDetails,
                resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              logger: dummyLogger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe(
                `${randomDebounceTimeout}ms (ab)`,
                {
                  a: actions.activities.upsertActivities({
                    accountId: account0Context.accountId,
                    activities: [mockAccountActivity],
                  }),
                  b: actions.activities.upsertActivities({
                    accountId: account0Context.accountId,
                    activities: [mockRewardActivity],
                  }),
                },
              );
              flush();
              expect(findMissingActivitiesMock).toHaveBeenCalledWith({
                addresses: allAddressesMock,
                transactionHistoryByAccount: transactionHistoryByAccountMock,
                accountRewardsHistoryByAccount: rewardsHistoryByAccountMock,
                mapRewardToActivity: mapRewardToActivityMock,
                loadedActivities: {},
                chainId,
                eraSummaries: [],
                desiredLoadedActivitiesCountPerAccount: {
                  [cardanoAccount0AddrWithData.accountId]: 10,
                },
              });
              expect(getTransactionDetails).toHaveBeenCalledWith(
                Cardano.TransactionId(mockTxId),
                {
                  chainId,
                },
              );
              expect(mapTransactionToActivityMock).toHaveBeenCalledWith(
                expect.objectContaining({
                  txDetails: mockTxDetails,
                  accountAddresses: [
                    CardanoPaymentAddress(cardanoAccount0AddrWithData.address),
                  ],
                  rewardAccount: rewardAccount0,
                  protocolParameters: protocolParametersMock,
                  logger: dummyLogger,
                }),
              );
            },
          };
        },
      );
    });

    it('does nothing when protocol parameters are undefined', () => {
      const findMissingActivitiesMock = vi.fn();
      const mockGetAccountActivity = vi.fn();
      const mapRewardToActivityMock = vi.fn();

      testSideEffect(
        createTrackAccountActivities({
          findMissingActivities: findMissingActivitiesMock,
          mapTransactionToActivity: mockGetAccountActivity,
          mapRewardToActivity: mapRewardToActivityMock,
          debounceTimeout: 0,
        }),
        ({ cold, expectObservable, flush }) => {
          // Protocol parameters are undefined
          const selectProtocolParameters$ = cold('a', { a: undefined });

          return {
            actionObservables: {},
            stateObservables: {
              addresses: {
                selectAllAddresses$: cold('a', {
                  a: [cardanoAccount0AddrWithData],
                }),
              },
              activities: {
                selectAllMap$: cold('a', { a: {} }),
                selectDesiredLoadedActivitiesCountPerAccount$: cold('a', {
                  a: {},
                }),
              },
              cardanoContext: {
                selectChainId$: cold('a', { a: chainId }),
                selectProtocolParameters$,
                selectEraSummaries$: cold('a', { a: [] }),
                selectTransactionHistoryGroupedByAccount$: cold('a', {
                  a: {
                    [cardanoAccount0Addr.accountId]: [
                      createTransactionHistoryItem({
                        id: mockTxId,
                        blockTime: Date.now(),
                      }),
                    ],
                  },
                }),
                selectRewardsHistoryGroupedByAccount$: cold('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              cardanoProvider:
                {} as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              logger: dummyLogger,
            },
            assertion: sideEffect$ => {
              // No actions should be emitted
              expectObservable(sideEffect$).toBe('');
              flush();
              expect(findMissingActivitiesMock).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('dispatches getActivitiesFailed on provider error', () => {
      const findMissingActivitiesMock = vi.fn();
      const mockGetAccountActivity = vi.fn();
      const mapRewardToActivityMock = vi.fn();

      testSideEffect(
        createTrackAccountActivities({
          findMissingActivities: findMissingActivitiesMock,
          mapTransactionToActivity: mockGetAccountActivity,
          mapRewardToActivity: mapRewardToActivityMock,
          debounceTimeout: 0,
        }),
        ({ cold, expectObservable }) => {
          const txToLoadData: MissingTransactionData = {
            kind: ActivityKind.Transaction,
            timestamp: Timestamp(Date.now()),
            txId: Cardano.TransactionId(mockTxId),
            accountId: cardanoAccount0AddrWithData.accountId,
            rewardAccount: CardanoRewardAccount(
              cardanoAccount0AddrWithData.data.rewardAccount,
            ),
            accountAddresses: [
              CardanoPaymentAddress(cardanoAccount0AddrWithData.address),
            ],
          };

          // Mock transaction to load
          findMissingActivitiesMock.mockReturnValue([txToLoadData]);

          // Mock transaction details error
          const error = new ProviderError(ProviderFailure.ConnectionFailure);
          const getTransactionDetails = vi.fn().mockReturnValue(of(Err(error)));

          return {
            actionObservables: {},
            stateObservables: {
              addresses: {
                selectAllAddresses$: cold('a', {
                  a: [cardanoAccount0AddrWithData],
                }),
              },
              activities: {
                selectAllMap$: cold('a', { a: {} }),
                selectDesiredLoadedActivitiesCountPerAccount$: cold('a', {
                  a: {},
                }),
              },
              cardanoContext: {
                selectChainId$: cold('a', { a: chainId }),
                selectProtocolParameters$: cold('a', {
                  a: {
                    coinsPerUtxoByte: 4310,
                  } as RequiredProtocolParameters,
                }),
                selectEraSummaries$: cold('a', { a: [] }),
                selectTransactionHistoryGroupedByAccount$: cold('a', {
                  a: {
                    [cardanoAccount0Addr.accountId]: [
                      createTransactionHistoryItem({
                        id: mockTxId,
                        blockTime: Date.now(),
                      }),
                    ],
                  },
                }),
                selectRewardsHistoryGroupedByAccount$: cold('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              cardanoProvider: {
                getTransactionDetails,
                resolveInput: vi.fn().mockReturnValue(of(Ok(null))),
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
              logger: dummyLogger,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.activities.getActivitiesFailed({
                  accountId: account0Context.accountId,
                  failure: error.reason,
                }),
              });
            },
          };
        },
      );
    });
  });
});
