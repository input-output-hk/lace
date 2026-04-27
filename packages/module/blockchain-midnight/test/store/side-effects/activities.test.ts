import { activitiesActions, ActivityType } from '@lace-contract/activities';
import { toUnshieldedTokenType } from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import type { TransactionHistoryEntry } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

const toWalletMap = (wallet: MidnightWallet): MidnightWalletsByAccountId => ({
  [wallet.accountId]: wallet,
});

const mockGetMidnightWallet = (wallet: MidnightWallet) => () => of(wallet);

const {
  mockBuildTokenBalanceChangesFromUtxos,
  mockGetAddressFromUtxos,
  mockFormatFee,
} = vi.hoisted(() => ({
  mockBuildTokenBalanceChangesFromUtxos: vi.fn(),
  mockGetAddressFromUtxos: vi.fn(),
  mockFormatFee: vi.fn(),
}));

vi.mock('../../../src/store/utils/activities', async importOriginal => {
  const actual = await importOriginal<typeof ActivitiesUtils>();
  return {
    ...actual,
    buildTokenBalanceChangesFromUtxos: mockBuildTokenBalanceChangesFromUtxos,
    getAddressFromUtxos: mockGetAddressFromUtxos,
    formatFee: mockFormatFee,
  };
});

const actions = {
  ...activitiesActions,
};

const mockDate = new Date();
vi.setSystemTime(mockDate);

const createMockTxHistoryEntry = (
  overrides: Partial<TransactionHistoryEntry> = {},
): TransactionHistoryEntry =>
  ({
    id: 1,
    hash: 'hash1',
    protocolVersion: 1,
    identifiers: [],
    timestamp: mockDate,
    fees: null,
    status: 'SUCCESS',
    createdUtxos: [],
    spentUtxos: [],
    ...overrides,
  } as TransactionHistoryEntry);

describe('updateActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildTokenBalanceChangesFromUtxos.mockReturnValue([]);
  });

  it('dispatches upsertActivities, setHasLoadedOldestEntry, and incrementDesiredLoadedActivitiesCount', () => {
    const accountId = AccountId('accountId');
    const activities = [
      createMockTxHistoryEntry({ hash: 'hash1' }),
      createMockTxHistoryEntry({ hash: 'hash2' }),
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

  it('calls buildTokenBalanceChangesFromUtxos with entry createdUtxos and spentUtxos', () => {
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
    const spentUtxos: TransactionHistoryEntry['spentUtxos'] = [];

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
        expect(mockBuildTokenBalanceChangesFromUtxos).toHaveBeenCalledWith(
          createdUtxos,
          spentUtxos,
          NetworkId.NetworkId.Preview,
        );
      },
    }));
  });

  it('includes tokenBalanceChanges from buildTokenBalanceChangesFromUtxos', () => {
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
    const spentUtxos: TransactionHistoryEntry['spentUtxos'] = [];
    const tokenBalanceChanges = [
      {
        tokenId: TokenId(
          toUnshieldedTokenType('type_a', NetworkId.NetworkId.Preview),
        ),
        amount: BigNumber(100n),
      },
    ];
    mockBuildTokenBalanceChangesFromUtxos.mockReturnValue(tokenBalanceChanges);

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
        expect(mockBuildTokenBalanceChangesFromUtxos).toHaveBeenCalledWith(
          createdUtxos,
          spentUtxos,
          NetworkId.NetworkId.Preview,
        );
      },
    }));
  });
});

describe('loadActivityDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildTokenBalanceChangesFromUtxos.mockReturnValue([]);
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

  it('calls buildTokenBalanceChangesFromUtxos, getAddressFromUtxos, formatFee with entry data', () => {
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
    const spentUtxos: TransactionHistoryEntry['spentUtxos'] = [];
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
          expect(mockBuildTokenBalanceChangesFromUtxos).toHaveBeenCalledWith(
            createdUtxos,
            spentUtxos,
            NetworkId.NetworkId.Preview,
          );
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
    const spentUtxos: TransactionHistoryEntry['spentUtxos'] = [];
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
