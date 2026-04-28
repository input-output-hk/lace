import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import {
  ACTIVITIES_PER_PAGE,
  activitiesActions,
} from '@lace-contract/activities';
import { walletsActions } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { Err, Ok, Timestamp } from '@lace-sdk/util';
import { EMPTY, of, take } from 'rxjs';
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
  getPollTransactionsObservable,
} from '../../../src/store/side-effects/create-track-account-transaction-history';
import {
  cardanoAccount0Addr,
  cardanoAccount1Addr,
  cardanoAccount2Addr1,
  cardanoAccount2Addr2,
  cardanoAccountPreviewAddr0,
  chainId,
  midnightAddress,
} from '../../mocks';

import type {
  CardanoAddressData,
  CardanoProviderDependencies,
  CardanoTransactionHistoryItem,
  Selectors,
} from '../../../src';
import type { AnyAddress } from '@lace-contract/addresses';
import type { StateObservables } from '@lace-contract/module';

const actions = {
  ...cardanoContextActions,
  ...activitiesActions,
  ...walletsActions,
};

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
      it('dispatches getLatestTransactionHistoryFailed', () => {
        // Simulate one successful and one failed request
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
            // Minimal setup
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
              },
              dependencies: {
                cardanoProvider: {
                  getAddressTransactionHistory:
                    getAddressTransactionHistoryMock,
                } as unknown as CardanoProviderDependencies['cardanoProvider'],
                actions,
              },
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('a', {
                  a: actions.cardanoContext.getAddressTransactionHistoryFailed({
                    accountId: cardanoAccount2Addr2WithCardanoData.accountId,
                    address: CardanoPaymentAddress(
                      cardanoAccount2Addr2WithCardanoData.address,
                    ),
                    failure: error.reason,
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

            // Source emits two accounts synchronously — simulates getPollTransactionsObservable
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

describe('getPollTransactionsObservable', () => {
  it('should emit when accountTransactionsTotal increases (reactive trigger)', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      const accountId = cardanoAccount2Addr1WithCardanoData.accountId;
      const stateObservables = {
        addresses: {
          selectAllAddresses$: cold('a', {
            a: [cardanoAccount2Addr1WithCardanoData],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          // Total increases from 5 to 6 at frame 100
          selectAccountTransactionsTotal$: cold('a 99ms b', {
            a: { [accountId]: 5 },
            b: { [accountId]: 6 },
          }),
        },
      } as unknown as StateObservables<Selectors>;

      const pollingObservable = getPollTransactionsObservable(stateObservables);

      // Should emit immediately for initial account, then again when total increases
      expectObservable(pollingObservable.pipe(take(2))).toBe('a 99ms (a|)', {
        a: {
          payload: {
            accountId,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
      });
    });
  });

  it('should request delta items when delta exceeds ACTIVITIES_PER_PAGE', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      const accountId = cardanoAccount2Addr1WithCardanoData.accountId;
      const extraBeyondPage = 5;
      const delta = ACTIVITIES_PER_PAGE + extraBeyondPage;
      const stateObservables = {
        addresses: {
          selectAllAddresses$: cold('a', {
            a: [cardanoAccount2Addr1WithCardanoData],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          // Total jumps by more than ACTIVITIES_PER_PAGE between emissions
          selectAccountTransactionsTotal$: cold('a 99ms b', {
            a: { [accountId]: 5 },
            b: { [accountId]: 5 + delta },
          }),
        },
      } as unknown as StateObservables<Selectors>;

      const pollingObservable = getPollTransactionsObservable(stateObservables);

      expectObservable(pollingObservable.pipe(take(2))).toBe('a 99ms (b|)', {
        // Initial observation: ACTIVITIES_PER_PAGE (no previous to compute delta against)
        a: {
          payload: {
            accountId,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
        // Subsequent increase: numberOfItems matches the delta
        b: {
          payload: {
            accountId,
            numberOfItems: delta,
          },
        },
      });
    });
  });

  it('emits one payload per account on initial observation with multiple accounts', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      const accountIdA = cardanoAccount0Addr.accountId;
      const accountIdB = cardanoAccount1Addr.accountId;
      const stateObservables = {
        addresses: {
          selectAllAddresses$: cold('a', {
            a: [cardanoAccount0Addr, cardanoAccount1Addr],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          selectAccountTransactionsTotal$: cold('a', {
            a: { [accountIdA]: 5, [accountIdB]: 10 },
          }),
        },
      } as unknown as StateObservables<Selectors>;

      const pollingObservable = getPollTransactionsObservable(stateObservables);

      // Both accounts are seen for the first time → both get an
      // ACTIVITIES_PER_PAGE initial-observation payload, synchronously fanned
      // out by the inner `from(items)` emission.
      expectObservable(pollingObservable.pipe(take(2))).toBe('(ab|)', {
        a: {
          payload: {
            accountId: accountIdA,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
        b: {
          payload: {
            accountId: accountIdB,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
      });
    });
  });

  it('emits a fresh initial observation when an account is removed then re-added with the same id', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      const accountId = cardanoAccount0Addr.accountId;
      const stateObservables = {
        addresses: {
          // Addresses present → removed → present again. Simulates a wallet
          // being unlinked and re-linked with the same accountId; mirrors the
          // realistic "removal" path because `prepareCardanoAccountsData`
          // filters out accounts whose addresses have disappeared. (Removal
          // via emptying `accountTransactionsTotal` is swallowed earlier by
          // that helper's `filter(totals → keys > 0)` gate.)
          selectAllAddresses$: cold('a 99ms b 99ms c', {
            a: [cardanoAccount0Addr],
            b: [],
            c: [cardanoAccount0Addr],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          // Totals always carry the account — the "removal" is driven by the
          // addresses stream alone, so the filter gate keeps passing.
          selectAccountTransactionsTotal$: cold('a', {
            a: { [accountId]: 5 },
          }),
        },
      } as unknown as StateObservables<Selectors>;

      const pollingObservable = getPollTransactionsObservable(stateObservables);

      // Frame 0: new account → emit.
      // Frame 100: addresses gone → current=[]; pairwise [A] → [] → no items.
      // Frame 200: addresses back → current=[A], previous=[] → treated as
      // new → fresh initial-observation emission.
      expectObservable(pollingObservable.pipe(take(2))).toBe('a 199ms (a|)', {
        a: {
          payload: {
            accountId,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
      });
    });
  });

  it('re-observes accounts under the new chain after a chain switch', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      const preprodAccountId = cardanoAccount0Addr.accountId;
      const previewAccountId = cardanoAccountPreviewAddr0.accountId;
      const stateObservables = {
        addresses: {
          selectAllAddresses$: cold('a 99ms b', {
            a: [cardanoAccount0Addr],
            b: [cardanoAccountPreviewAddr0],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a 99ms b', {
            a: Cardano.ChainIds.Preprod,
            b: Cardano.ChainIds.Preview,
          }),
          selectAccountTransactionsTotal$: cold('a 99ms b', {
            a: { [preprodAccountId]: 5 },
            b: { [previewAccountId]: 5 },
          }),
        },
      } as unknown as StateObservables<Selectors>;

      const pollingObservable = getPollTransactionsObservable(stateObservables);

      // After the chain switch, the Preprod-scoped address is filtered out by
      // `groupCardanoAddressesByAccount`, so the Preview account is "new" from
      // pairwise's perspective and gets a fresh initial-observation payload.
      expectObservable(pollingObservable.pipe(take(2))).toBe('a 99ms (b|)', {
        a: {
          payload: {
            accountId: preprodAccountId,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
        b: {
          payload: {
            accountId: previewAccountId,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
      });
    });
  });

  it('only emits for the newly discovered account when an existing account is unchanged', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      const accountIdA = cardanoAccount0Addr.accountId;
      const accountIdB = cardanoAccount1Addr.accountId;
      const stateObservables = {
        addresses: {
          // B's address is discovered at frame 100.
          selectAllAddresses$: cold('a 99ms b', {
            a: [cardanoAccount0Addr],
            b: [cardanoAccount0Addr, cardanoAccount1Addr],
          }),
        },
        cardanoContext: {
          selectChainId$: cold('a', { a: chainId }),
          // A's total is unchanged; B appears at frame 100.
          selectAccountTransactionsTotal$: cold('a 99ms b', {
            a: { [accountIdA]: 5 },
            b: { [accountIdA]: 5, [accountIdB]: 10 },
          }),
        },
      } as unknown as StateObservables<Selectors>;

      const pollingObservable = getPollTransactionsObservable(stateObservables);

      // Frame 0: A is new → emit.
      // Frame 100: A delta=0 (silent), B is new → emit only for B.
      expectObservable(pollingObservable.pipe(take(2))).toBe('a 99ms (b|)', {
        a: {
          payload: {
            accountId: accountIdA,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
        b: {
          payload: {
            accountId: accountIdB,
            numberOfItems: ACTIVITIES_PER_PAGE,
          },
        },
      });
    });
  });
});

describe('getLoadOlderActivitiesObservable', () => {
  it('should return an observable that emits the accountId and numberOfItems', () => {
    const accountId1 = cardanoAccount2Addr1.accountId;
    const accountId2 = cardanoAccount2Addr2.accountId;
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
      const loadOlderActivitiesObservable = getLoadOlderActivitiesObservable(
        activities,
        cardanoContext,
        sync,
      );

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
});
