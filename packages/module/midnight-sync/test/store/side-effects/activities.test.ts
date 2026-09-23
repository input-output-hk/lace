import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { toUnshieldedTokenType } from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FEATURE_FLAG_MIDNIGHT_SHIELDED_ACTIVITY_ROWS } from '../../../src/const';
import {
  loadActivityDetails,
  mapTxHistoryEntryToActivity,
  updateActivities,
} from '../../../src/store/side-effects/activities';

import type * as ActivitiesUtils from '../../../src/store/utils/activities';
import type { Activity } from '@lace-contract/activities';
import type {
  MidnightWalletsByAccountId,
  MidnightWallet,
} from '@lace-contract/midnight-context';
import type { WalletEntry } from '@midnightntwrk/wallet-sdk';

type UnshieldedUtxoList = NonNullable<WalletEntry['unshielded']>['spentUtxos'];

type ColdFunction = Parameters<Parameters<typeof testSideEffect>[1]>[0]['cold'];

/** Feature state for updateActivities; pass flags to enable the toggle. */
const featuresState = (cold: ColdFunction, featureFlags: unknown[] = []) => ({
  features: {
    selectLoadedFeatures$: cold('a', {
      a: { featureFlags, modules: [] },
    }),
    selectNextFeatureFlags$: cold(''),
  },
});

const toWalletMap = (wallet: MidnightWallet): MidnightWalletsByAccountId => ({
  [wallet.accountId]: wallet,
});

const mockGetMidnightWallet = (wallet: MidnightWallet) => () => of(wallet);

const { mockDeriveUnshieldedActivity, mockGetAddressFromUtxos, mockFormatFee } =
  vi.hoisted(() => ({
    mockDeriveUnshieldedActivity: vi.fn(),
    mockGetAddressFromUtxos: vi.fn(),
    mockFormatFee: vi.fn(),
  }));

vi.mock('../../../src/store/utils/activities', async importOriginal => {
  const actual = await importOriginal<typeof ActivitiesUtils>();
  return {
    ...actual,
    deriveUnshieldedActivity: mockDeriveUnshieldedActivity,
    getAddressFromUtxos: mockGetAddressFromUtxos,
    formatFee: mockFormatFee,
  };
});

const actions = {
  ...activitiesActions,
};

const mockDate = new Date();
vi.setSystemTime(mockDate);

type MockOverrides = Partial<Omit<WalletEntry, 'unshielded'>> & {
  createdUtxos?: UnshieldedUtxoList;
  spentUtxos?: UnshieldedUtxoList;
};

const createMockTxHistoryEntry = (
  overrides: MockOverrides = {},
): WalletEntry => {
  const { createdUtxos = [], spentUtxos = [], ...rest } = overrides;
  return {
    hash: 'hash1',
    protocolVersion: 1,
    identifiers: [],
    timestamp: mockDate,
    fees: null,
    status: 'SUCCESS',
    unshielded: { id: 1, createdUtxos, spentUtxos },
    ...rest,
  };
};

const unshieldedUtxo: UnshieldedUtxoList[number] = {
  value: 1n,
  owner: 'own-addr',
  tokenType: 'token',
  intentHash: 'ih',
  outputIndex: 0,
};

describe('updateActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeriveUnshieldedActivity.mockReturnValue({
      type: ActivityType.Receive,
      tokenBalanceChanges: [],
    });
  });

  it('dispatches upsertActivities, setHasLoadedOldestEntry, and incrementDesiredLoadedActivitiesCount', () => {
    const accountId = AccountId('accountId');
    const activities = [
      createMockTxHistoryEntry({
        hash: 'hash1',
        createdUtxos: [unshieldedUtxo],
      }),
      createMockTxHistoryEntry({
        hash: 'hash2',
        createdUtxos: [unshieldedUtxo],
      }),
    ];
    testSideEffect(updateActivities, ({ cold, expectObservable }) => ({
      dependencies: {
        actions,
        midnightWallets$: cold('a', {
          a: toWalletMap({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            transactionHistory$: cold('a', { a: activities }),
          } as unknown as MidnightWallet),
        }),
      },
      stateObservables: featuresState(cold) as never,
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(abc)', {
          a: actions.activities.upsertActivities({
            accountId,
            activities: [
              expect.objectContaining({
                accountId,
                activityId: 'hash1',
                timestamp: mockDate.getTime(),
              }) as Activity,
              expect.objectContaining({
                accountId,
                activityId: 'hash2',
                timestamp: mockDate.getTime(),
              }) as Activity,
            ],
          }),
          b: actions.activities.setHasLoadedOldestEntry({
            accountId,
            hasLoadedOldestEntry: true,
          }),
          c: actions.activities.setDesiredLoadedActivitiesCount({
            accountId,
            desiredLoadedActivitiesCount: 2,
          }),
        });
      },
    }));
  });

  it('derives type and balance changes from the entry unshielded utxos', () => {
    const accountId = AccountId('accountId');
    const createdUtxos = [
      {
        value: 100n,
        owner: 'addr',
        tokenType: 't',
        intentHash: 'h1',
        outputIndex: 0,
      },
    ];
    const spentUtxos: UnshieldedUtxoList = [];

    testSideEffect(updateActivities, ({ cold, expectObservable, flush }) => ({
      dependencies: {
        actions,
        midnightWallets$: cold('a', {
          a: toWalletMap({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            transactionHistory$: cold('a', {
              a: [
                createMockTxHistoryEntry({
                  hash: 'hash1',
                  createdUtxos,
                  spentUtxos,
                }),
              ],
            }),
          } as unknown as MidnightWallet),
        }),
      },
      stateObservables: featuresState(cold) as never,
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(abc)', {
          a: actions.activities.upsertActivities({
            accountId,
            activities: [
              expect.objectContaining({
                accountId,
                activityId: 'hash1',
                type: ActivityType.Receive,
                timestamp: mockDate.getTime(),
                tokenBalanceChanges: [],
              }) as Activity,
            ],
          }),
          b: actions.activities.setHasLoadedOldestEntry({
            accountId,
            hasLoadedOldestEntry: true,
          }),
          c: actions.activities.setDesiredLoadedActivitiesCount({
            accountId,
            desiredLoadedActivitiesCount: 1,
          }),
        });
        flush();
        expect(mockDeriveUnshieldedActivity).toHaveBeenCalledWith({
          status: 'SUCCESS',
          createdUtxos,
          spentUtxos,
          networkId: NetworkId.NetworkId.Preview,
        });
      },
    }));
  });

  it('includes tokenBalanceChanges from deriveUnshieldedActivity', () => {
    const accountId = AccountId('accountId');
    const createdUtxos = [
      {
        value: 100n,
        owner: 'addr_1',
        tokenType: 'type_a',
        intentHash: 'h1',
        outputIndex: 0,
      },
    ];
    const spentUtxos: UnshieldedUtxoList = [];
    const tokenBalanceChanges = [
      {
        tokenId: TokenId(
          toUnshieldedTokenType('type_a', NetworkId.NetworkId.Preview),
        ),
        amount: BigNumber(100n),
      },
    ];
    mockDeriveUnshieldedActivity.mockReturnValue({
      type: ActivityType.Receive,
      tokenBalanceChanges,
    });

    testSideEffect(updateActivities, ({ cold, expectObservable, flush }) => ({
      dependencies: {
        actions,
        midnightWallets$: cold('a', {
          a: toWalletMap({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            transactionHistory$: cold('a', {
              a: [
                createMockTxHistoryEntry({
                  hash: 'hash1',
                  createdUtxos,
                  spentUtxos,
                }),
              ],
            }),
          } as unknown as MidnightWallet),
        }),
      },
      stateObservables: featuresState(cold) as never,
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(abc)', {
          a: actions.activities.upsertActivities({
            accountId,
            activities: [
              expect.objectContaining({
                accountId,
                activityId: 'hash1',
                type: ActivityType.Receive,
                timestamp: mockDate.getTime(),
                tokenBalanceChanges,
              }) as Activity,
            ],
          }),
          b: actions.activities.setHasLoadedOldestEntry({
            accountId,
            hasLoadedOldestEntry: true,
          }),
          c: actions.activities.setDesiredLoadedActivitiesCount({
            accountId,
            desiredLoadedActivitiesCount: 1,
          }),
        });
        flush();
        expect(mockDeriveUnshieldedActivity).toHaveBeenCalledWith({
          status: 'SUCCESS',
          createdUtxos,
          spentUtxos,
          networkId: NetworkId.NetworkId.Preview,
        });
      },
    }));
  });

  it('suppresses shielded-only entries from display and purges any stored row for them', () => {
    const accountId = AccountId('accountId');
    testSideEffect(updateActivities, ({ cold, expectObservable }) => ({
      dependencies: {
        actions,
        midnightWallets$: cold('a', {
          a: toWalletMap({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            transactionHistory$: cold('a', {
              a: [
                createMockTxHistoryEntry({
                  hash: 'unshielded',
                  createdUtxos: [unshieldedUtxo],
                }),
                createMockTxHistoryEntry({ hash: 'shielded-only' }),
              ],
            }),
          } as unknown as MidnightWallet),
        }),
      },
      stateObservables: featuresState(cold) as never,
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(abcd)', {
          a: actions.activities.upsertActivities({
            accountId,
            activities: [
              expect.objectContaining({ activityId: 'unshielded' }) as Activity,
            ],
          }),
          b: actions.activities.removeActivities({
            accountId,
            activityIds: ['shielded-only'],
          }),
          c: actions.activities.setHasLoadedOldestEntry({
            accountId,
            hasLoadedOldestEntry: true,
          }),
          d: actions.activities.setDesiredLoadedActivitiesCount({
            accountId,
            desiredLoadedActivitiesCount: 1,
          }),
        });
      },
    }));
  });

  it('shows shielded-only entries, and purges nothing, when the flag is on', () => {
    const accountId = AccountId('accountId');
    testSideEffect(updateActivities, ({ cold, expectObservable }) => ({
      dependencies: {
        actions,
        midnightWallets$: cold('a', {
          a: toWalletMap({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            transactionHistory$: cold('a', {
              a: [
                createMockTxHistoryEntry({
                  hash: 'unshielded',
                  createdUtxos: [unshieldedUtxo],
                }),
                createMockTxHistoryEntry({ hash: 'shielded-only' }),
              ],
            }),
          } as unknown as MidnightWallet),
        }),
      },
      stateObservables: featuresState(cold, [
        { key: FEATURE_FLAG_MIDNIGHT_SHIELDED_ACTIVITY_ROWS },
      ]) as never,
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(abc)', {
          a: actions.activities.upsertActivities({
            accountId,
            activities: [
              expect.objectContaining({ activityId: 'unshielded' }) as Activity,
              expect.objectContaining({
                activityId: 'shielded-only',
              }) as Activity,
            ],
          }),
          b: actions.activities.setHasLoadedOldestEntry({
            accountId,
            hasLoadedOldestEntry: true,
          }),
          c: actions.activities.setDesiredLoadedActivitiesCount({
            accountId,
            desiredLoadedActivitiesCount: 2,
          }),
        });
      },
    }));
  });

  it('keeps a net-zero self-transfer visible while the suppression is active', () => {
    // A self-transfer has unshielded utxos that net to zero; a shielded-only
    // entry has none at all. Gating on presence, not on the net, is what keeps
    // the two apart.
    const accountId = AccountId('accountId');
    mockDeriveUnshieldedActivity.mockReturnValue({
      type: ActivityType.Self,
      tokenBalanceChanges: [],
    });
    testSideEffect(updateActivities, ({ cold, expectObservable }) => ({
      dependencies: {
        actions,
        midnightWallets$: cold('a', {
          a: toWalletMap({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            transactionHistory$: cold('a', {
              a: [
                createMockTxHistoryEntry({
                  hash: 'self-transfer',
                  createdUtxos: [unshieldedUtxo],
                  spentUtxos: [unshieldedUtxo],
                }),
              ],
            }),
          } as unknown as MidnightWallet),
        }),
      },
      stateObservables: featuresState(cold) as never,
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(abc)', {
          a: actions.activities.upsertActivities({
            accountId,
            activities: [
              expect.objectContaining({
                activityId: 'self-transfer',
                type: ActivityType.Self,
                tokenBalanceChanges: [],
              }) as Activity,
            ],
          }),
          b: actions.activities.setHasLoadedOldestEntry({
            accountId,
            hasLoadedOldestEntry: true,
          }),
          c: actions.activities.setDesiredLoadedActivitiesCount({
            accountId,
            desiredLoadedActivitiesCount: 1,
          }),
        });
      },
    }));
  });
});

describe('loadActivityDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeriveUnshieldedActivity.mockReturnValue({
      type: ActivityType.Receive,
      tokenBalanceChanges: [],
    });
    mockGetAddressFromUtxos.mockReturnValue('');
    mockFormatFee.mockImplementation((f: unknown) => {
      if (f === null || f === undefined) return '0';
      if (typeof f === 'bigint') return String(f);
      return '0';
    });
  });

  it('noop when specified blockchainName is not Midnight', () => {
    const accountId = AccountId('accountId');
    const activityId = 'activity1';
    testSideEffect(loadActivityDetails, ({ cold, expectObservable }) => {
      const getTransactionHistoryEntryByHashMock = vi.fn().mockReturnValue(
        cold('a', {
          a: createMockTxHistoryEntry({ hash: activityId }),
        }),
      );
      return {
        actionObservables: {
          activities: {
            loadActivityDetails$: cold('a', {
              a: actions.activities.loadActivityDetails({
                activity: {
                  activityId,
                } as Activity,
                blockchainName: 'Cardano',
              }),
            }),
          },
        },
        dependencies: {
          actions,
          getMidnightWalletByAccountId: mockGetMidnightWallet({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            getTransactionHistoryEntryByHash:
              getTransactionHistoryEntryByHashMock,
          } as unknown as MidnightWallet),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('');
        },
      };
    });
  });

  it('queries midnight wallet for details of an activity', () => {
    const accountId = AccountId('accountId');
    const activityId = 'activity1';
    testSideEffect(loadActivityDetails, ({ cold, expectObservable, flush }) => {
      const getTransactionHistoryEntryByHashMock = vi.fn().mockReturnValue(
        cold('a', {
          a: createMockTxHistoryEntry({ hash: activityId }),
        }),
      );
      return {
        actionObservables: {
          activities: {
            loadActivityDetails$: cold('a', {
              a: actions.activities.loadActivityDetails({
                activity: {
                  activityId,
                  accountId,
                } as Activity,
                blockchainName: 'Midnight',
              }),
            }),
          },
        },
        dependencies: {
          actions,
          getMidnightWalletByAccountId: mockGetMidnightWallet({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            getTransactionHistoryEntryByHash:
              getTransactionHistoryEntryByHashMock,
          } as unknown as MidnightWallet),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            a: expect.any(Object),
          });
          flush();

          expect(getTransactionHistoryEntryByHashMock).toHaveBeenCalledWith(
            activityId,
          );
        },
      };
    });
  });

  it('dispatches setActivityDetails action with activity details from utils', () => {
    const accountId = AccountId('accountId');
    const activityId = 'activity1';
    const txHistoryEntry = createMockTxHistoryEntry({
      hash: activityId,
      fees: 100n,
    });

    testSideEffect(loadActivityDetails, ({ cold, expectObservable, flush }) => {
      const getTransactionHistoryEntryByHashMock = vi.fn().mockReturnValue(
        cold('a', {
          a: txHistoryEntry,
        }),
      );
      let emittedAction: unknown;
      return {
        actionObservables: {
          activities: {
            loadActivityDetails$: cold('a', {
              a: actions.activities.loadActivityDetails({
                activity: {
                  activityId,
                  accountId,
                } as Activity,
                blockchainName: 'Midnight',
              }),
            }),
          },
        },
        dependencies: {
          actions,
          getMidnightWalletByAccountId: mockGetMidnightWallet({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            getTransactionHistoryEntryByHash:
              getTransactionHistoryEntryByHashMock,
          } as unknown as MidnightWallet),
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(a => {
            emittedAction = a;
          });
          expectObservable(sideEffect$).toBe('a', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            a: expect.any(Object),
          });
          flush();
          /* eslint-disable @typescript-eslint/no-unsafe-assignment */
          expect(emittedAction).toEqual(
            expect.objectContaining({
              type: 'activities/setActivityDetails',
              payload: expect.objectContaining({
                activityDetails: expect.objectContaining({
                  activityId,
                  address: '',
                  fee: '100',
                  tokenBalanceChanges: [],
                }),
              }),
            }),
          );
          /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        },
      };
    });
  });

  it('derives activity, address and fee from entry data', () => {
    const accountId = AccountId('accountId');
    const activityId = 'activity1';
    const createdUtxos = [
      {
        value: 50n,
        owner: 'addr_1',
        tokenType: 't',
        intentHash: 'h1',
        outputIndex: 0,
      },
    ];
    const spentUtxos: UnshieldedUtxoList = [];
    const txHistoryEntry = createMockTxHistoryEntry({
      hash: activityId,
      createdUtxos,
      spentUtxos,
      fees: 100n,
    });

    testSideEffect(loadActivityDetails, ({ cold, expectObservable, flush }) => {
      const getTransactionHistoryEntryByHashMock = vi
        .fn()
        .mockReturnValue(cold('a', { a: txHistoryEntry }));
      return {
        actionObservables: {
          activities: {
            loadActivityDetails$: cold('a', {
              a: actions.activities.loadActivityDetails({
                activity: { activityId, accountId } as Activity,
                blockchainName: 'Midnight',
              }),
            }),
          },
        },
        dependencies: {
          actions,
          getMidnightWalletByAccountId: mockGetMidnightWallet({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            getTransactionHistoryEntryByHash:
              getTransactionHistoryEntryByHashMock,
          } as unknown as MidnightWallet),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            a: expect.any(Object),
          });
          flush();
          expect(mockDeriveUnshieldedActivity).toHaveBeenCalledWith({
            status: 'SUCCESS',
            createdUtxos,
            spentUtxos,
            networkId: NetworkId.NetworkId.Preview,
          });
          expect(mockGetAddressFromUtxos).toHaveBeenCalledWith(
            createdUtxos,
            spentUtxos,
          );
          expect(mockFormatFee).toHaveBeenCalledWith(100n);
        },
      };
    });
  });

  it('dispatches setActivityDetails with address from getAddressFromUtxos', () => {
    const accountId = AccountId('accountId');
    const activityId = 'activity1';
    const createdUtxos = [
      {
        value: 100n,
        owner: 'addr_from_utxo',
        tokenType: 'type_a',
        intentHash: 'h1',
        outputIndex: 0,
      },
    ];
    const spentUtxos: UnshieldedUtxoList = [];
    const txHistoryEntry = createMockTxHistoryEntry({
      hash: activityId,
      createdUtxos,
      spentUtxos,
      fees: 50n,
    });
    const resolvedAddress = 'addr_from_utxo';
    mockGetAddressFromUtxos.mockReturnValue(resolvedAddress);

    testSideEffect(loadActivityDetails, ({ cold, expectObservable }) => {
      const getTransactionHistoryEntryByHashMock = vi
        .fn()
        .mockReturnValue(cold('a', { a: txHistoryEntry }));
      return {
        actionObservables: {
          activities: {
            loadActivityDetails$: cold('a', {
              a: actions.activities.loadActivityDetails({
                activity: { activityId, accountId } as Activity,
                blockchainName: 'Midnight',
              }),
            }),
          },
        },
        dependencies: {
          actions,
          getMidnightWalletByAccountId: mockGetMidnightWallet({
            accountId,
            networkId: NetworkId.NetworkId.Preview,
            getTransactionHistoryEntryByHash:
              getTransactionHistoryEntryByHashMock,
          } as unknown as MidnightWallet),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.activities.setActivityDetails({
              activityDetails: {
                ...mapTxHistoryEntryToActivity({
                  accountId,
                  txHistoryEntry,
                  networkId: NetworkId.NetworkId.Preview,
                }),
                address: resolvedAddress,
                fee: '50',
              },
            }),
          });
        },
      };
    });
  });
});
