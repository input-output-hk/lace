import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import {
  ActivitiesPaginationFailureId,
  activitiesActions,
} from '@lace-contract/activities';
import { failuresActions } from '@lace-contract/failures';
import { walletsActions } from '@lace-contract/wallet-repo';
import { Err, Ok, Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { EMPTY, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  cardanoContextActions,
  CardanoRewardAccount,
  CardanoPaymentAddress,
} from '../../../src';
import { fetchAddressTransactionHistories } from '../../../src/store/helpers/fetch-address-transaction-histories';
import {
  createTrackAccountTransactionHistory,
  getLoadOlderActivitiesObservable,
} from '../../../src/store/side-effects/create-track-account-transaction-history';
import {
  cardanoAccount0Addr,
  cardanoAccount1Addr,
  cardanoAccount2Addr1,
  cardanoAccount2Addr2,
  chainId,
  midnightAddress,
} from '../../mocks';

import type {
  CardanoAddressData,
  CardanoProviderDependencies,
  CardanoTransactionHistoryItem,
  Selectors,
} from '../../../src';
import type { ActionCreators } from '../../../src/contract';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  ActionObservables,
  StateObservables,
} from '@lace-contract/module';

const actions = {
  ...cardanoContextActions,
  ...activitiesActions,
  ...walletsActions,
  ...failuresActions,
};

const selectFailureById$ = of(() => undefined);

const rewardAccount1 = CardanoRewardAccount(
  'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx',
);
const cardanoAccount2Addr1WithCardanoData = {
  ...cardanoAccount2Addr1,
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
    rewardAccount: rewardAccount1,
  },
};
const cardanoAccount2Addr2WithCardanoData = {
  ...cardanoAccount2Addr2,
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
    rewardAccount: rewardAccount1,
  },
};

const mockAddress1History = [
  {
    txId: Cardano.TransactionId(
      'dcf1ef3ec07e4754c81653a33548ba8ef8fc062a485b80fc454995091d5316a8',
    ),
    blockNumber: Cardano.BlockNo(1),
    txIndex: Cardano.TxIndex(2),
    blockTime: Timestamp(4),
  },
  {
    txId: Cardano.TransactionId(
      '3477c72b0fd0f78281f22c3bb88642ad57c7c45c89c85117d4753ec66b58933b',
    ),
    blockNumber: Cardano.BlockNo(0),
    txIndex: Cardano.TxIndex(0),
    blockTime: Timestamp(1), // oldest
  },
] satisfies CardanoTransactionHistoryItem[];

const mockAddress2History = [
  {
    txId: Cardano.TransactionId(
      'df4c7f04249deb697aa5d3a41901f793ca8893b8c9a59f6c1a7a8c72d4e2afda',
    ),
    blockNumber: Cardano.BlockNo(2),
    txIndex: Cardano.TxIndex(0),
    blockTime: Timestamp(5), // newest
  },
  {
    txId: Cardano.TransactionId(
      'df4c7f04249deb697aa5d3a41901f793ca8893b8c9a59f6c1a7a8c72d4e2afda',
    ),
    blockNumber: Cardano.BlockNo(1),
    txIndex: Cardano.TxIndex(1),
    blockTime: Timestamp(3),
  },
  {
    txId: Cardano.TransactionId(
      'cf4d91fc4fa7bd54b7390ee52f8f79b8544e30905bc52fa39e0a0fa1afcca638',
    ),
    blockNumber: Cardano.BlockNo(1),
    txIndex: Cardano.TxIndex(0),
    blockTime: Timestamp(2),
  },
] satisfies CardanoTransactionHistoryItem[];

describe('cardano-context side effects', () => {
  describe('trackAccountTransactionHistory', () => {
    it('queries and updates transaction history for a given cardano account on active network', () => {
      // Simulate successful history provider response for both addresses
      const getAddressTransactionHistoryMock = vi
        .fn()
        .mockImplementation(
          ({ address }: { address: CardanoPaymentAddress }) => {
            switch (address.toString()) {
              case cardanoAccount2Addr1WithCardanoData.address:
                return of(Ok(mockAddress1History));
              case cardanoAccount2Addr2WithCardanoData.address:
                return of(Ok(mockAddress2History));
              default:
                return EMPTY;
            }
          },
        );

      testSideEffect(
        {
          build: ({ cold }) => {
            const sourceObservable = cold('---a', {
              a: {
                payload: {
                  accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                  numberOfItems: 3,
                },
              },
            });

            return createTrackAccountTransactionHistory(
              fetchAddressTransactionHistories,
              sourceObservable,
            );
          },
        },
        ({ cold, hot, expectObservable }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          // simulate sequential address discovery
          const selectAllAddresses$ = hot<AnyAddress[]>('abc', {
            a: [midnightAddress],
            b: [midnightAddress, cardanoAccount2Addr1WithCardanoData],
            c: [
              midnightAddress,
              cardanoAccount2Addr1WithCardanoData,
              cardanoAccount2Addr2WithCardanoData,
            ],
          });

          return {
            stateObservables: {
              cardanoContext: {
                selectChainId$,
                selectAccountTransactionHistory$: cold('a', {
                  a: {},
                }),
              },
              addresses: { selectAllAddresses$ },
              failures: { selectFailureById$ },
            },
            dependencies: {
              cardanoProvider: {
                getAddressTransactionHistory: getAddressTransactionHistoryMock,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('---a', {
                a: actions.cardanoContext.setAccountTransactionHistory({
                  accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                  addressHistories: [
                    {
                      address: CardanoPaymentAddress(
                        cardanoAccount2Addr1WithCardanoData.address,
                      ),
                      transactionHistory: mockAddress1History,
                      hasLoadedOldestEntry: true,
                    },
                    {
                      address: CardanoPaymentAddress(
                        cardanoAccount2Addr2WithCardanoData.address,
                      ),
                      transactionHistory: mockAddress2History,
                      hasLoadedOldestEntry: false,
                    },
                  ],
                }),
              });
            },
          };
        },
      );
    });

    it('dispatches setHasLoadedOldestEntry(true) without provider calls when every known address already loaded its oldest entry', () => {
      // Regression: when desired > loaded but every address has
      // hasLoadedOldestEntry: true in cardanoContext, the helper short-
      // circuits with Ok([]) so the side effect can flip the account-level
      // flag and stop the Activities-tab loader. Without this emission the
      // loader spins forever (e.g. after thorough HD sync settles every
      // address into a `true` state).
      const getAddressTransactionHistoryMock = vi.fn();
      const address1 = CardanoPaymentAddress(
        cardanoAccount2Addr1WithCardanoData.address,
      );
      const address2 = CardanoPaymentAddress(
        cardanoAccount2Addr2WithCardanoData.address,
      );

      testSideEffect(
        {
          build: ({ cold }) => {
            const sourceObservable = cold('---a', {
              a: {
                payload: {
                  accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                  numberOfItems: 20,
                },
              },
            });
            return createTrackAccountTransactionHistory(
              fetchAddressTransactionHistories,
              sourceObservable,
            );
          },
        },
        ({ cold, expectObservable, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectAllAddresses$ = cold<AnyAddress[]>('a', {
            a: [
              cardanoAccount2Addr1WithCardanoData,
              cardanoAccount2Addr2WithCardanoData,
            ],
          });
          const selectAccountTransactionHistory$ = cold('a', {
            a: {
              [cardanoAccount2Addr1WithCardanoData.accountId]: {
                [address1]: {
                  hasLoadedOldestEntry: true,
                  transactionHistory: mockAddress1History,
                },
                [address2]: {
                  hasLoadedOldestEntry: true,
                  transactionHistory: mockAddress2History,
                },
              },
            },
          });

          return {
            stateObservables: {
              cardanoContext: {
                selectChainId$,
                selectAccountTransactionHistory$,
              },
              addresses: { selectAllAddresses$ },
              failures: { selectFailureById$ },
            },
            dependencies: {
              cardanoProvider: {
                getAddressTransactionHistory: getAddressTransactionHistoryMock,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('---(ab)', {
                a: actions.cardanoContext.setAccountTransactionHistory({
                  accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                  addressHistories: [],
                }),
                b: actions.activities.setHasLoadedOldestEntry({
                  accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                  hasLoadedOldestEntry: true,
                }),
              });
              flush();
              expect(getAddressTransactionHistoryMock).not.toHaveBeenCalled();
            },
          };
        },
      );
    });

    it('triggers setHasLoadedOldestEntry only when all addresses have loaded oldest entry', () => {
      // Simulate successful history provider response for both addresses
      const getAddressTransactionHistoryMock = vi
        .fn()
        .mockImplementation(
          ({ address }: { address: CardanoPaymentAddress }) => {
            switch (address.toString()) {
              case cardanoAccount2Addr1WithCardanoData.address:
                return of(Ok(mockAddress1History));
              case cardanoAccount2Addr2WithCardanoData.address:
                return of(Ok(mockAddress2History));
              default:
                return EMPTY;
            }
          },
        );

      testSideEffect(
        {
          build: ({ cold }) => {
            const sourceObservable = cold('---a', {
              a: {
                payload: {
                  accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                  numberOfItems: 4,
                },
              },
            });

            return createTrackAccountTransactionHistory(
              fetchAddressTransactionHistories,
              sourceObservable,
            );
          },
        },
        ({ cold, hot, expectObservable }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          // simulate sequential address discovery
          const selectAllAddresses$ = hot<AnyAddress[]>('abc', {
            a: [midnightAddress],
            b: [midnightAddress, cardanoAccount2Addr1WithCardanoData],
            c: [
              midnightAddress,
              cardanoAccount2Addr1WithCardanoData,
              cardanoAccount2Addr2WithCardanoData,
            ],
          });

          return {
            stateObservables: {
              cardanoContext: {
                selectChainId$,
                selectAccountTransactionHistory$: cold('a', {
                  a: {},
                }),
              },
              addresses: { selectAllAddresses$ },
              failures: { selectFailureById$ },
            },
            dependencies: {
              cardanoProvider: {
                getAddressTransactionHistory: getAddressTransactionHistoryMock,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('---(ab)', {
                a: actions.cardanoContext.setAccountTransactionHistory({
                  accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                  addressHistories: [
                    {
                      address: CardanoPaymentAddress(
                        cardanoAccount2Addr1WithCardanoData.address,
                      ),
                      transactionHistory: mockAddress1History,
                      hasLoadedOldestEntry: true,
                    },
                    {
                      address: CardanoPaymentAddress(
                        cardanoAccount2Addr2WithCardanoData.address,
                      ),
                      transactionHistory: mockAddress2History,
                      hasLoadedOldestEntry: true,
                    },
                  ],
                }),
                b: actions.activities.setHasLoadedOldestEntry({
                  accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                  hasLoadedOldestEntry: true,
                }),
              });
            },
          };
        },
      );
    });

    describe('when account discovery failed (no addresses)', () => {
      it('does not fetch account history', () => {
        // Simulate one successful and one failed request
        const getAddressTransactionHistoryMock = vi.fn();
        testSideEffect(
          {
            build: ({ cold }) => {
              const sourceObservable = cold('a', {
                a: {
                  payload: {
                    accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                    numberOfItems: 3,
                  },
                },
              });
              return createTrackAccountTransactionHistory(
                fetchAddressTransactionHistories,
                sourceObservable,
              );
            },
          },
          ({ cold, expectObservable }) => {
            // Minimal setup
            const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
            const selectAllAddresses$ = cold<
              AnyAddress<Partial<CardanoAddressData>>[]
            >('a', {
              a: [],
            });
            const selectAccountTransactionHistory$ = cold('a', {
              a: {},
            });

            return {
              actionObservables: {},
              stateObservables: {
                cardanoContext: {
                  selectChainId$,
                  selectAccountTransactionHistory$,
                },
                addresses: { selectAllAddresses$ },
                failures: { selectFailureById$ },
              },
              dependencies: {
                cardanoProvider: {
                  getAddressTransactionHistory:
                    getAddressTransactionHistoryMock,
                } as unknown as CardanoProviderDependencies['cardanoProvider'],
                actions,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('');
              },
            };
          },
        );
      });
    });

    describe('when transaction history provider returns an error', () => {
      it('retries with exponential backoff and dispatches addFailure after retries exhausted', () => {
        const error = new ProviderError(ProviderFailure.ConnectionFailure);
        const getAddressTransactionHistoryMock = vi
          .fn()
          .mockImplementation(
            ({ address }: { address: CardanoPaymentAddress }) => {
              switch (address.toString()) {
                case cardanoAccount2Addr1WithCardanoData.address:
                  return of(Ok(mockAddress1History));
                case cardanoAccount2Addr2WithCardanoData.address:
                  return of(Err(error));
                default:
                  return EMPTY;
              }
            },
          );

        testSideEffect(
          {
            build: ({ cold }) => {
              const sourceObservable = cold('a', {
                a: {
                  payload: {
                    accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                    numberOfItems: 3,
                  },
                },
              });
              return createTrackAccountTransactionHistory(
                fetchAddressTransactionHistories,
                sourceObservable,
              );
            },
          },
          ({ cold, expectObservable }) => {
            const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
            const selectAllAddresses$ = cold<
              AnyAddress<Partial<CardanoAddressData>>[]
            >('a', {
              a: [
                cardanoAccount2Addr1WithCardanoData,
                cardanoAccount2Addr2WithCardanoData,
              ],
            });
            const selectAccountTransactionHistory$ = cold('a', {
              a: {},
            });

            return {
              actionObservables: {},
              stateObservables: {
                cardanoContext: {
                  selectChainId$,
                  selectAccountTransactionHistory$,
                },
                addresses: { selectAllAddresses$ },
                failures: { selectFailureById$ },
              },
              dependencies: {
                cardanoProvider: {
                  getAddressTransactionHistory:
                    getAddressTransactionHistoryMock,
                } as unknown as CardanoProviderDependencies['cardanoProvider'],
                actions,
              },
              assertion: sideEffect$ => {
                // retryBackoff: 300ms + 600ms + 1200ms = 2100ms before exhaustion.
                // Synchronous Err emission per attempt (no inner frame delay).
                expectObservable(sideEffect$).toBe('2100ms a', {
                  a: actions.failures.addFailure({
                    failureId: ActivitiesPaginationFailureId(
                      cardanoAccount2Addr1WithCardanoData.accountId,
                    ),
                    message: 'activities.error.pagination-failed',
                    retryAction: actions.activities.retryPagination({
                      accountId: cardanoAccount2Addr1WithCardanoData.accountId,
                    }),
                  }),
                });
              },
            };
          },
        );
      });
    });

    it('processes all accounts when source emits multiple accounts synchronously (LW-14748)', () => {
      const getAddressTransactionHistoryMock = vi.fn();

      testSideEffect(
        {
          build: ({ cold }) => {
            // Mock returns ASYNC results (2-frame delay) to expose the exhaustMap bug.
            // With synchronous mocks the inner observable completes instantly and
            // exhaustMap accepts the next emission. With async mocks, the inner is
            // still active when the second emission arrives → exhaustMap drops it.
            getAddressTransactionHistoryMock.mockImplementation(
              ({ address }: { address: CardanoPaymentAddress }) => {
                switch (address.toString()) {
                  case cardanoAccount0Addr.address.toString():
                    return cold('--a|', { a: Ok(mockAddress1History) });
                  case cardanoAccount1Addr.address.toString():
                    return cold('--a|', { a: Ok(mockAddress2History) });
                  default:
                    return EMPTY;
                }
              },
            );

            // Source emits two accounts synchronously — simulates a source that emits multiple accounts in one tick
            const sourceObservable = cold('---(ab)', {
              a: {
                payload: {
                  accountId: cardanoAccount0Addr.accountId,
                  numberOfItems: 3,
                },
              },
              b: {
                payload: {
                  accountId: cardanoAccount1Addr.accountId,
                  numberOfItems: 3,
                },
              },
            });

            return createTrackAccountTransactionHistory(
              fetchAddressTransactionHistories,
              sourceObservable,
            );
          },
        },
        ({ cold, hot, flush }) => {
          const selectChainId$ = cold<Cardano.ChainId>('a', { a: chainId });
          const selectAllAddresses$ = hot<AnyAddress[]>('a', {
            a: [cardanoAccount0Addr, cardanoAccount1Addr],
          });

          return {
            stateObservables: {
              cardanoContext: {
                selectChainId$,
                selectAccountTransactionHistory$: cold('a', { a: {} }),
              },
              addresses: { selectAllAddresses$ },
              failures: { selectFailureById$ },
            },
            dependencies: {
              cardanoProvider: {
                getAddressTransactionHistory: getAddressTransactionHistoryMock,
              } as unknown as CardanoProviderDependencies['cardanoProvider'],
              actions,
            },
            assertion: sideEffect$ => {
              const emissions: ReturnType<
                typeof actions.cardanoContext.setAccountTransactionHistory
              >[] = [];
              sideEffect$.subscribe(action =>
                emissions.push(action as (typeof emissions)[number]),
              );
              flush();

              // Both accounts should have their history fetched
              const setHistoryActions = emissions.filter(
                a =>
                  a.type ===
                  actions.cardanoContext.setAccountTransactionHistory.type,
              );

              // With exhaustMap: only 1 account processed (bug).
              // With concatMap: both accounts processed (fix).
              expect(setHistoryActions).toHaveLength(2);
              expect(setHistoryActions.map(a => a.payload.accountId)).toEqual(
                expect.arrayContaining([
                  cardanoAccount0Addr.accountId,
                  cardanoAccount1Addr.accountId,
                ]),
              );
            },
          };
        },
      );
    });
  });
});

describe('getLoadOlderActivitiesObservable', () => {
  const accountId1 = cardanoAccount2Addr1.accountId;
  const accountId2 = cardanoAccount2Addr2.accountId;

  const buildActionObservables = (retryPagination$: unknown = EMPTY) =>
    ({
      activities: { retryPagination$ },
    } as unknown as ActionObservables<ActionCreators>);

  it('should return an observable that emits the accountId and numberOfItems', () => {
    const cardanoContext = {
      selectCombinedTransactionHistory$: of({
        [accountId1]: mockAddress1History,
        [accountId2]: mockAddress2History,
      }),
    } as unknown as StateObservables<Selectors>['cardanoContext'];
    const desiredAccount1Activities = 2;
    const desiredAccount2Activities = 10;
    const activities = {
      selectDesiredLoadedActivitiesCountPerAccount$: of({
        [accountId1]: desiredAccount1Activities,
        [accountId2]: desiredAccount2Activities,
      }),
      selectAllMap$: of({
        [accountId1]: mockAddress1History,
        [accountId2]: mockAddress2History,
      }),
    } as unknown as StateObservables<Selectors>['activities'];

    const sync = {
      selectSyncStatusByAccount$: of({
        [accountId1]: {},
        [accountId2]: {
          lastSuccessfulSync: Timestamp(Date.now()),
        },
      }),
    } as unknown as StateObservables<Selectors>['sync'];

    createTestScheduler().run(({ expectObservable }) => {
      const loadOlderActivitiesObservable = getLoadOlderActivitiesObservable({
        actionObservables: buildActionObservables(),
        activities,
        cardanoContext,
        sync,
      });

      expectObservable(loadOlderActivitiesObservable).toBe('(a|)', {
        a: {
          payload: {
            accountId: accountId2,
            numberOfItems:
              desiredAccount2Activities - mockAddress2History.length,
          },
        },
      });
    });
  });

  it('re-emits a trigger for the target account when retryPagination is dispatched', () => {
    const desiredAccount2Activities = 10;

    createTestScheduler().run(({ cold, expectObservable }) => {
      const cardanoContext = {
        selectCombinedTransactionHistory$: cold('a', {
          a: { [accountId2]: mockAddress2History },
        }),
      } as unknown as StateObservables<Selectors>['cardanoContext'];

      const activities = {
        // Same reference after the failure: mirrors the Immer no-op when
        // desired > loaded (pagination manual-retry scenario).
        selectDesiredLoadedActivitiesCountPerAccount$: cold('a', {
          a: { [accountId2]: desiredAccount2Activities },
        }),
        selectAllMap$: cold('a', {
          a: { [accountId2]: mockAddress2History },
        }),
      } as unknown as StateObservables<Selectors>['activities'];

      const sync = {
        selectSyncStatusByAccount$: cold('a', {
          a: {
            [accountId2]: { lastSuccessfulSync: Timestamp(Date.now()) },
          },
        }),
      } as unknown as StateObservables<Selectors>['sync'];

      const retryPagination$ = cold('--a', {
        a: { payload: { accountId: accountId2 } },
      });

      const loadOlderActivitiesObservable = getLoadOlderActivitiesObservable({
        actionObservables: buildActionObservables(retryPagination$),
        activities,
        cardanoContext,
        sync,
      });

      const expected = {
        payload: {
          accountId: accountId2,
          numberOfItems: desiredAccount2Activities - mockAddress2History.length,
        },
      };
      // Frame 0: state-driven trigger. Frame 2: retryPagination-driven trigger.
      expectObservable(loadOlderActivitiesObservable).toBe('a-a', {
        a: expected,
      });
    });
  });
});
