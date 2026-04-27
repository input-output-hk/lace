import { randomBytes } from 'node:crypto';

import { Percent } from '@cardano-sdk/util';
import { addressesActions } from '@lace-contract/addresses';
import {
  createInitialMidnightTokenMetadata,
  createMidnightToken,
  type MidnightAccountProps,
  midnightContextActions,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { syncActions } from '@lace-contract/sync';
import { TokenId, tokensActions } from '@lace-contract/tokens';
import { testSideEffect } from '@lace-lib/util-dev';
import { BigNumber, HexBytes, Timestamp } from '@lace-sdk/util';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  resetIdleTimerOnDustActivity,
  updateDustBalance,
  updateDustGenerationDetails,
  updateSetPublicKeys,
  updateSyncProgress,
  updateTokens,
  upsertAddresses,
  watchMidnightAccounts,
} from '../../../src/store/side-effects/watch';
import { midnightActions } from '../../../src/store/slice';

import type { watchMidnightAccount } from '../../../src/store/side-effects/watch';
import type {
  AccountKeyManager,
  MidnightNetworkConfig,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type {
  CoinsByTokenType,
  MidnightWallet,
  MidnightWalletAddress,
} from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';
import type { AccountSyncStatus } from '@lace-contract/sync';
import type { MetadataByTokenId } from '@lace-contract/tokens';
import type {
  AccountId,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { FacadeState } from '@midnight-ntwrk/wallet-sdk-facade';
import type { RunHelpers } from 'rxjs/testing';

// The wallet's coinsByTokenType$ emits this structure (not exported from midnight-context)
type ObservableMidnightWalletCoinsByTokenType = {
  shielded: CoinsByTokenType;
  unshielded: CoinsByTokenType;
};

// Inline type since MidnightWalletSyncProgress is not exported
type SyncProgress = {
  dust: Percent;
  shielded: Percent;
  unshielded: Percent;
  isStrictlyComplete: {
    dust: boolean;
    shielded: boolean;
    unshielded: boolean;
  };
};

const {
  accountId,
  walletId,
  midnightShieldedAddress,
  midnightUnshieldedAddress,
  midnightDustAddress,
} = stubData;
const networkId = MidnightSDKNetworkIds.Preview;

const actions = {
  ...addressesActions,
  ...midnightContextActions,
  ...midnightActions,
  ...syncActions,
  ...tokensActions,
};

const createMockMidnightWallet = (
  cold: RunHelpers['cold'],
  overrides: Partial<MidnightWallet>,
): MidnightWallet => ({
  accountId,
  networkId,
  nightVerifyingKey: createKeystore(randomBytes(32), networkId).getPublicKey(),
  walletId,
  address$: cold(''),
  areKeysAvailable$: cold(''),
  coinsByTokenType$: cold(''),
  syncProgress$: cold(''),
  transactionHistory$: cold(''),
  balanceFinalizedTransaction: () => cold(''),
  balanceUnboundTransaction: () => cold(''),
  balanceUnprovenTransaction: () => cold(''),
  calculateTransactionFee: () => cold(''),
  estimateTransactionFee: () => cold(''),
  deregisterFromDustGeneration: () => cold(''),
  getTransactionHistoryEntryByHash: () => cold(''),
  finalizeRecipe: () => cold(''),
  finalizeTransaction: () => cold(''),
  registerNightUtxosForDustGeneration: () => cold(''),
  initSwap: () => cold(''),
  state: () => cold(''),
  stop: () => cold(''),
  signRecipe: () => cold(''),
  signData: () => cold(''),
  signUnprovenTransaction: () => cold(''),
  submitTransaction: () => cold(''),
  transferTransaction: () => cold(''),
  ...overrides,
});

describe('upsertAddresses', () => {
  it('emits upsertAddresses with shielded and dust when unshielded feature flag is disabled', () => {
    const address: MidnightWalletAddress = {
      shielded: midnightShieldedAddress,
      unshielded: midnightUnshieldedAddress,
      dust: midnightDustAddress,
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            address$: cold('a', { a: address }),
          });
          return upsertAddresses(wallet, cold('a', { a: false }));
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.upsertAddresses({
                blockchainName: 'Midnight',
                accountId,
                addresses: [
                  { address: address.shielded },
                  { address: address.dust },
                ],
              }),
            });
          },
        };
      },
    );
  });

  it('emits upsertAddresses including unshielded when feature flag is enabled', () => {
    const address: MidnightWalletAddress = {
      shielded: midnightShieldedAddress,
      unshielded: midnightUnshieldedAddress,
      dust: midnightDustAddress,
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            address$: cold('a', { a: address }),
          });
          return upsertAddresses(wallet, cold('a', { a: true }));
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.addresses.upsertAddresses({
                blockchainName: 'Midnight',
                accountId,
                addresses: [
                  { address: address.shielded },
                  { address: address.unshielded },
                  { address: address.dust },
                ],
              }),
            });
          },
        };
      },
    );
  });
});

describe('updateSyncProgress', () => {
  it('emits addSyncOperation when syncProgress$ first emits', () => {
    const syncProgress: SyncProgress = {
      shielded: Percent(0.5),
      unshielded: Percent(0),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(wallet, cold('a', { a: false }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.5), // shielded only (dust=0 excluded from display)
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('emits completeSyncOperation when sync progress reaches 1', () => {
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: true, unshielded: true },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(wallet, cold('a', { a: false }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // Should emit both addSyncOperation and completeSyncOperation
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(1),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
              b: actions.sync.completeSyncOperation({
                accountId,
                operationId: `${accountId}-midnight-sync`,
              }),
            });
          },
        };
      },
    );
  });

  it('emits updateSyncProgress when progress changes after sync already started (uses shielded+dust average when unshielded disabled)', () => {
    // When unshielded is disabled: progress = (shielded + dust) / 2
    const syncProgressPartial: SyncProgress = {
      shielded: Percent(0.5),
      unshielded: Percent(0),
      dust: Percent(0.5),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };
    const syncProgressComplete: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: true, shielded: true, unshielded: true },
    };

    const operationId = `${accountId}-midnight-sync`;

    // State that shows sync is already in progress
    const pendingSyncStatus: Record<AccountId, AccountSyncStatus> = {
      [accountId]: {
        pendingSync: {
          startedAt: Timestamp(Date.now()),
          operations: {
            [operationId]: {
              operationId,
              status: 'InProgress',
              type: 'Determinate',
              progress: Percent(0),
              description: 'sync.operation.midnight-wallet-sync',
              startedAt: Timestamp(Date.now()),
            },
          },
        },
      },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            // Emit b 501ms after a (trailing space required for Xms to be parsed
            // as a time progression by the RxJS marble parser), so b arrives after
            // the 500ms throttleTime window and passes through immediately.
            syncProgress$: cold('a 500ms b', {
              a: syncProgressPartial,
              b: syncProgressComplete,
            }),
          });
          return updateSyncProgress(wallet, cold('a', { a: false }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              // Start with pending sync status already present
              selectSyncStatusByAccount$: cold('a', { a: pendingSyncStatus }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // First emission (a) passes through throttle immediately (leading).
            // Second emission (b) arrives after the 500ms throttle window and
            // passes through as the leading edge of a new throttle window.
            expectObservable(sideEffect$).toBe('a 500ms (bc)', {
              a: actions.sync.updateSyncProgress({
                accountId,
                operationId,
                progress: Percent(0.5),
              }),
              b: actions.sync.updateSyncProgress({
                accountId,
                operationId,
                progress: Percent(1),
              }),
              c: actions.sync.completeSyncOperation({
                accountId,
                operationId,
              }),
            });
          },
        };
      },
    );
  });

  it('completes sync when shielded is 1 but dust is 0 and unshielded is disabled (dust wallet unavailable)', () => {
    // When dust is 0 but shielded is 1, dust is excluded from calculation
    // So shielded=1, dust=0 should result in progress=1
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: true, unshielded: true },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(wallet, cold('a', { a: false }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(1), // Average: 1 / 1
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
              b: actions.sync.completeSyncOperation({
                accountId,
                operationId: `${accountId}-midnight-sync`,
              }),
            });
          },
        };
      },
    );
  });

  it('calculates progress as average of shielded+unshielded+dust when feature flag is enabled', () => {
    // When unshielded is enabled: progress = (shielded + unshielded + dust) / 3
    // So shielded=1, unshielded=0, dust=1 should result in progress=0.66666666
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(1),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(wallet, cold('a', { a: true }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // Progress should be 0.6666666 (average of shielded=1, unshielded=0, and dust=1)
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.6666666666666666), // Average: (1 + 0 + 1) / 3
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('calculates progress as average of shielded+unshielded+dust when feature flag is enabled but dust sync is 0', () => {
    // Dust is excluded from DISPLAY when dust=0 (unstarted), to avoid halving the shown percentage.
    // But isDustIncluded=true because other wallets are still in progress (prevents premature completion).
    // So shielded=1, unshielded=0, dust=0 → display progress = (1 + 0) / 2 = 0.5
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(wallet, cold('a', { a: true }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.5), // Display: (shielded=1 + unshielded=0) / 2; dust excluded (unstarted)
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('completes sync when shielded and unshielded are 1 but dust is 0 (dust wallet unavailable)', () => {
    // When dust is 0 but shielded and unshielded are 1, dust is excluded from calculation
    // So shielded=1, unshielded=1, dust=0 should result in progress=1
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(1),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: true, unshielded: true },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(wallet, cold('a', { a: true }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(1), // Average: (1 + 1) / 2
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
              b: actions.sync.completeSyncOperation({
                accountId,
                operationId: `${accountId}-midnight-sync`,
              }),
            });
          },
        };
      },
    );
  });

  it('does not complete sync when ratio is 1 but isStrictlyComplete is false (false completion regression)', () => {
    // computeConnectedSyncRatio returns 1 when isConnected=true and both indices are 0.
    // Without the isStrictlyComplete guard, this would trigger premature completion.
    const syncProgress: SyncProgress = {
      shielded: Percent(1),
      unshielded: Percent(0),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(wallet, cold('a', { a: false }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // Must emit only addSyncOperation, NOT completeSyncOperation
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(1),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('does not halve displayed progress when dust is unstarted (stuck at 45% regression)', () => {
    // Before the fix, unstarted dust (dust=0) was included in the progress denominator,
    // causing e.g. shielded=90% to display as 45% instead of 90%.
    // With the fix: dust is excluded from DISPLAY when dust=0, but isDustIncluded=true
    // (because other wallets are still in progress) so completion still requires dust.
    const syncProgress: SyncProgress = {
      shielded: Percent(0.9),
      unshielded: Percent(0),
      dust: Percent(0),
      isStrictlyComplete: { dust: false, shielded: false, unshielded: false },
    };

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            syncProgress$: cold('a', { a: syncProgress }),
          });
          return updateSyncProgress(wallet, cold('a', { a: false }));
        },
      },
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {
            sync: {
              selectSyncStatusByAccount$: cold('a', { a: {} }),
            },
          },
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            // Progress should be shielded=0.9, not (0.9 + 0) / 2 = 0.45
            expectObservable(sideEffect$).toBe('a', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'InProgress',
                  type: 'Determinate',
                  progress: Percent(0.9),
                  description: 'sync.operation.midnight-wallet-sync',
                  startedAt: expect.any(Number) as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });
});

const dustParams = {
  nightDustRatio: 10n,
  generationDecayRate: 1n,
};

describe('updateDustBalance', () => {
  it('does not emit duplicate setDustBalance when same balance emits twice', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          // State emits twice with the same balance
          const mockState = {
            dust: {
              balance: () => 1000n,
              availableCoinsWithFullInfo: () => [],
              state: { state: { params: dustParams } },
            },
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a-a', { a: mockState }),
          });
          return updateDustBalance(wallet);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a-', {
              a: actions.midnightContext.setDustBalance({
                accountId,
                dustBalance: BigNumber(1000n),
              }),
            });
          },
        };
      },
    );
  });

  it('emits setDustBalance when wallet.state() emits different balance values', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          // State emits with different balance values
          const mockState1 = {
            dust: {
              balance: () => 1000n,
              availableCoinsWithFullInfo: () => [],
              state: { state: { params: dustParams } },
            },
          } as unknown as FacadeState;
          const mockState2 = {
            dust: {
              balance: () => 2000n,
              availableCoinsWithFullInfo: () => [],
              state: { state: { params: dustParams } },
            },
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a----b', { a: mockState1, b: mockState2 }),
          });
          return updateDustBalance(wallet);
        },
      },
      ({ flush }) => {
        const emissions: unknown[] = [];
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            const dustBalanceActions = emissions.filter(
              (
                a,
              ): a is ReturnType<
                typeof actions.midnightContext.setDustBalance
              > =>
                (a as { type?: string }).type ===
                'midnightContext/setDustBalance',
            );
            expect(dustBalanceActions).toHaveLength(2);
            expect(
              BigNumber.valueOf(dustBalanceActions[0].payload.dustBalance),
            ).toBe(1000n);
            expect(
              BigNumber.valueOf(dustBalanceActions[1].payload.dustBalance),
            ).toBe(2000n);
          },
        };
      },
    );
  });
});

describe('updateDustGenerationDetails', () => {
  it('emits setDustGenerationDetails with aggregated details when availableCoinsWithFullInfo returns coins', () => {
    const decayTime1 = new Date(1000);
    const maxCapReachedAt1 = new Date(2000);
    const decayTime2 = new Date(500);
    const maxCapReachedAt2 = new Date(3000);
    const coinsWithFullInfo = [
      {
        generatedNow: 10n,
        maxCap: 100n,
        rate: 1n,
        dtime: decayTime1,
        maxCapReachedAt: maxCapReachedAt1,
      },
      {
        generatedNow: 20n,
        maxCap: 200n,
        rate: 2n,
        dtime: decayTime2,
        maxCapReachedAt: maxCapReachedAt2,
      },
    ];
    const mockState = {
      dust: {
        balance: () => 30n,
        availableCoinsWithFullInfo: () => coinsWithFullInfo,
        state: { state: { params: dustParams } },
      },
    } as unknown as FacadeState;

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a', { a: mockState }),
          });
          return updateDustGenerationDetails(wallet);
        },
      },
      ({ flush }) => {
        const emissions: unknown[] = [];
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            sideEffect$.subscribe(action => emissions.push(action));
            flush();
            const dustGenActions = emissions.filter(
              (
                a,
              ): a is ReturnType<
                typeof actions.midnightContext.setDustGenerationDetails
              > =>
                (a as { type?: string }).type ===
                'midnightContext/setDustGenerationDetails',
            );
            expect(dustGenActions).toHaveLength(1);
            // Payload is serialized (Serializable.to) in the action
            expect(dustGenActions[0].payload).toMatchObject({
              accountId,
              dustGenerationDetails: {
                currentValue: {
                  __storeSerializedType: 'bigint',
                  value: '30',
                },
                maxCap: {
                  __storeSerializedType: 'bigint',
                  value: '300',
                },
                rate: {
                  __storeSerializedType: 'bigint',
                  value: '3',
                },
                decayTime: 500,
                maxCapReachedAt: 3000,
              },
            });
          },
        };
      },
    );
  });

  it('does not emit duplicate setDustGenerationDetails when same details emit twice (distinctUntilChanged)', () => {
    const coinsWithFullInfo = [
      {
        generatedNow: 5n,
        maxCap: 50n,
        rate: 1n,
        dtime: new Date(1000),
        maxCapReachedAt: new Date(2000),
      },
    ];
    const mockState = {
      dust: {
        balance: () => 5n,
        availableCoinsWithFullInfo: () => coinsWithFullInfo,
        state: { state: { params: dustParams } },
      },
    } as unknown as FacadeState;

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a-a', { a: mockState }),
          });
          return updateDustGenerationDetails(wallet);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a-', {
              a: actions.midnightContext.setDustGenerationDetails({
                accountId,
                dustGenerationDetails: {
                  currentValue: 5n,
                  maxCap: 50n,
                  decayTime: 1000,
                  maxCapReachedAt: 2000,
                  rate: 1n,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('emits setDustGenerationDetails with undefined when no coins available', () => {
    const mockState = {
      dust: {
        balance: () => 1000n,
        availableCoinsWithFullInfo: () => [],
        state: { state: { params: dustParams } },
      },
    } as unknown as FacadeState;

    testSideEffect(
      {
        build: ({ cold }) => {
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a', { a: mockState }),
          });
          return updateDustGenerationDetails(wallet);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.midnightContext.setDustGenerationDetails({
                accountId,
                dustGenerationDetails: undefined,
              }),
            });
          },
        };
      },
    );
  });
});

describe('updateSetPublicKeys', () => {
  const coinKeyHex = 'deadbeef';
  const encryptionKeyHex = 'cafebabe';
  const mockShieldedKeys = {
    coinPublicKey: { toHexString: () => coinKeyHex },
    encryptionPublicKey: { toHexString: () => encryptionKeyHex },
  };

  it('emits setPublicKeys with coin and encryption keys from wallet.state()', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          const mockState = {
            shielded: mockShieldedKeys,
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a', { a: mockState }),
          });
          return updateSetPublicKeys(wallet);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(a|)', {
              a: actions.midnightContext.setPublicKeys({
                accountId,
                publicKeys: {
                  coin: HexBytes(coinKeyHex),
                  encryption: HexBytes(encryptionKeyHex),
                },
              }),
            });
          },
        };
      },
    );
  });

  it('only emits once (take(1)) even when wallet.state() emits multiple times', () => {
    testSideEffect(
      {
        build: ({ cold }) => {
          const mockState1 = {
            shielded: mockShieldedKeys,
          } as unknown as FacadeState;
          const mockState2 = {
            shielded: {
              coinPublicKey: { toHexString: () => '11111111' },
              encryptionPublicKey: { toHexString: () => '22222222' },
            },
          } as unknown as FacadeState;
          const wallet = createMockMidnightWallet(cold, {
            state: () => cold('a-b', { a: mockState1, b: mockState2 }),
          });
          return updateSetPublicKeys(wallet);
        },
      },
      ({ expectObservable }) => {
        return {
          actionObservables: {},
          stateObservables: {},
          dependencies: {
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(a|)', {
              a: actions.midnightContext.setPublicKeys({
                accountId,
                publicKeys: {
                  coin: HexBytes(coinKeyHex),
                  encryption: HexBytes(encryptionKeyHex),
                },
              }),
            });
          },
        };
      },
    );
  });
});

describe('updateTokens', () => {
  const tokenX = TokenId('X');
  const tokenY = TokenId('Y');

  describe('setAddressTokens', () => {
    it('emits setAddressTokens action for shielded tokens', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {
          [tokenX]: [
            { status: 'available', value: BigNumber(2n) },
            { status: 'pending', value: BigNumber(5n) },
          ],
          [tokenY]: [{ status: 'available', value: BigNumber(3n) }],
        },
        unshielded: {},
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: false }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              const setAddressTokensActions = emissions.filter(
                (a): a is ReturnType<typeof actions.tokens.setAddressTokens> =>
                  (a as { type?: string }).type ===
                  'rawTokens/setAddressTokens',
              );
              expect(setAddressTokensActions).toHaveLength(1);
              expect(setAddressTokensActions[0]).toEqual(
                actions.tokens.setAddressTokens({
                  accountId,
                  address: midnightShieldedAddress,
                  blockchainName: 'Midnight',
                  tokens: [
                    createMidnightToken(tokenX, {
                      available: 2n,
                      pending: 5n,
                    }),
                    createMidnightToken(tokenY, {
                      available: 3n,
                      pending: 0n,
                    }),
                  ],
                }),
              );
            },
          };
        },
      );
    });

    it('emits setAddressTokens action for unshielded tokens when feature is enabled', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {},
        unshielded: {
          [tokenX]: [
            {
              status: 'available',
              value: BigNumber(2n),
              registeredForDustGeneration: false,
            },
            {
              status: 'pending',
              value: BigNumber(5n),
              registeredForDustGeneration: false,
            },
          ],
          [tokenY]: [
            {
              status: 'available',
              value: BigNumber(3n),
              registeredForDustGeneration: false,
            },
          ],
        },
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: true }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              const setAddressTokensActions = emissions.filter(
                (a): a is ReturnType<typeof actions.tokens.setAddressTokens> =>
                  (a as { type?: string }).type ===
                  'rawTokens/setAddressTokens',
              );
              expect(setAddressTokensActions).toHaveLength(2);
              expect(setAddressTokensActions[0]).toEqual(
                actions.tokens.setAddressTokens({
                  accountId,
                  address: midnightShieldedAddress,
                  blockchainName: 'Midnight',
                  tokens: [],
                }),
              );
              expect(setAddressTokensActions[1]).toEqual(
                actions.tokens.setAddressTokens({
                  accountId,
                  address: midnightUnshieldedAddress,
                  blockchainName: 'Midnight',
                  tokens: [
                    createMidnightToken(tokenX, {
                      available: 2n,
                      pending: 5n,
                    }),
                    createMidnightToken(tokenY, {
                      available: 3n,
                      pending: 0n,
                    }),
                  ],
                }),
              );
            },
          };
        },
      );
    });

    it('does not emit setAddressTokens action for unshielded tokens when feature is disabled', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {},
        unshielded: {
          [tokenX]: [
            {
              status: 'available',
              value: BigNumber(2n),
              registeredForDustGeneration: false,
            },
            {
              status: 'pending',
              value: BigNumber(5n),
              registeredForDustGeneration: false,
            },
          ],
          [tokenY]: [
            {
              status: 'available',
              value: BigNumber(3n),
              registeredForDustGeneration: false,
            },
          ],
        },
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: false }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              // Filter for setAddressTokens actions only
              const setAddressTokensActions = emissions.filter(
                (a): a is ReturnType<typeof actions.tokens.setAddressTokens> =>
                  (a as { type?: string }).type ===
                  'rawTokens/setAddressTokens',
              );
              // Only shielded (empty) action since feature is disabled
              expect(setAddressTokensActions).toHaveLength(1);
              expect(setAddressTokensActions[0]).toEqual(
                actions.tokens.setAddressTokens({
                  accountId,
                  address: midnightShieldedAddress,
                  blockchainName: 'Midnight',
                  tokens: [],
                }),
              );
            },
          };
        },
      );
    });
  });

  describe('upsertTokensMetadata', () => {
    it('emits upsertTokensMetadata action for shielded tokens', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coins = [{ status: 'available' as const, value: BigNumber(10n) }];
      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {
          [tokenX]: coins,
        },
        unshielded: {},
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: false }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              const upsertMetadataActions = emissions.filter(
                (
                  a,
                ): a is ReturnType<
                  typeof actions.tokens.upsertTokensMetadata
                > =>
                  (a as { type?: string }).type ===
                  'tokensMetadata/upsertTokensMetadata',
              );
              expect(upsertMetadataActions).toHaveLength(1);
              expect(upsertMetadataActions[0]).toEqual(
                actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    createInitialMidnightTokenMetadata({
                      tokenType: tokenX,
                      kind: 'shielded',
                      networkId,
                      coins,
                    }),
                  ],
                  balances: { [tokenX]: '10' },
                }),
              );
            },
          };
        },
      );
    });

    it('emits upsertTokensMetadata action for unshielded tokens when feature is enabled', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coins = [
        {
          status: 'available' as const,
          value: BigNumber(10n),
          registeredForDustGeneration: false,
        },
      ];
      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {},
        unshielded: {
          [tokenX]: coins,
        },
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: true }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              const upsertMetadataActions = emissions.filter(
                (
                  a,
                ): a is ReturnType<
                  typeof actions.tokens.upsertTokensMetadata
                > =>
                  (a as { type?: string }).type ===
                  'tokensMetadata/upsertTokensMetadata',
              );
              expect(upsertMetadataActions).toHaveLength(1);
              expect(upsertMetadataActions[0]).toEqual(
                actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    createInitialMidnightTokenMetadata({
                      tokenType: tokenX,
                      kind: 'unshielded',
                      networkId,
                      coins,
                    }),
                  ],
                  balances: { [tokenX]: '10' },
                }),
              );
            },
          };
        },
      );
    });

    it('does not emit upsertTokensMetadata action for unshielded tokens when feature is disabled', () => {
      const address: MidnightWalletAddress = {
        shielded: midnightShieldedAddress,
        unshielded: midnightUnshieldedAddress,
        dust: midnightDustAddress,
      };

      const coins = [
        {
          status: 'available' as const,
          value: BigNumber(10n),
          registeredForDustGeneration: false,
        },
      ];
      const coinsByTokenType: ObservableMidnightWalletCoinsByTokenType = {
        shielded: {},
        unshielded: {
          [tokenX]: coins,
        },
      };

      testSideEffect(
        {
          build: ({ cold }) => {
            const wallet = createMockMidnightWallet(cold, {
              address$: cold('a', { a: address }),
              coinsByTokenType$: cold('a', { a: coinsByTokenType }),
            });
            return updateTokens(wallet, cold('a', { a: false }));
          },
        },
        ({ cold, flush }) => {
          const emissions: unknown[] = [];
          return {
            actionObservables: {},
            stateObservables: {
              tokens: {
                selectTokensMetadata$: cold<MetadataByTokenId>('a', {
                  a: {},
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              // Filter for upsertTokensMetadata actions only
              const upsertMetadataActions = emissions.filter(
                (
                  a,
                ): a is ReturnType<
                  typeof actions.tokens.upsertTokensMetadata
                > =>
                  (a as { type?: string }).type ===
                  'tokensMetadata/upsertTokensMetadata',
              );
              // No metadata actions expected since only unshielded tokens and feature is disabled
              expect(upsertMetadataActions).toHaveLength(0);
            },
          };
        },
      );
    });
  });
});

describe('resetIdleTimerOnDustActivity', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type MockDustState = { dust: { availableCoins: any[] } };

  const createMockKeyManager = (
    keys$Subject: Subject<unknown>,
    areKeysAvailable$: Observable<boolean> = of(true),
  ): AccountKeyManager =>
    ({
      keys$: keys$Subject.asObservable(),
      areKeysAvailable$,
      destroy: vi.fn(),
    } as unknown as AccountKeyManager);

  const createMockWalletWithDustState = (
    dustState$: Observable<MockDustState>,
  ): MidnightWallet =>
    ({
      accountId,
      networkId,
      walletId,
      state: () => dustState$,
    } as unknown as MidnightWallet);

  it('subscribes to keys$ when dust availableCoins count changes (after initial emission)', () => {
    const testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    testScheduler.run(({ cold, flush }) => {
      const keys$Subject = new Subject<unknown>();
      const keyManager = createMockKeyManager(keys$Subject);
      const keysSubscribeSpy = vi.fn();

      // Create state emissions: initial (0 coins), then change (2 coins)
      const dustState$ = cold('a-b', {
        a: { dust: { availableCoins: [] } },
        b: { dust: { availableCoins: [{}, {}] } }, // 2 coins
      });

      const wallet = createMockWalletWithDustState(dustState$);

      // Subscribe to the observable
      resetIdleTimerOnDustActivity(wallet, keyManager).subscribe();

      // Mock keys$ to track when it's subscribed
      const originalKeys$ = keyManager.keys$;
      Object.defineProperty(keyManager, 'keys$', {
        get: () => {
          keysSubscribeSpy();
          return originalKeys$;
        },
      });

      // Provide keys when requested
      keys$Subject.next({ walletKeys: {} });

      flush();

      // keys$ should be subscribed to after the second emission (the change)
      // Initial emission is skipped, change triggers subscription
      expect(keysSubscribeSpy).toHaveBeenCalled();
    });
  });

  it('does not subscribe to keys$ when dust availableCoins count stays the same', () => {
    const testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    testScheduler.run(({ cold, flush }) => {
      const keys$Subject = new BehaviorSubject<unknown>({ walletKeys: {} });
      const keyManager = createMockKeyManager(keys$Subject);
      let keysAccessCount = 0;

      // Create state emissions with same count: 2 coins each time
      const dustState$ = cold('a-b-c', {
        a: { dust: { availableCoins: [{}, {}] } },
        b: { dust: { availableCoins: [{}, {}] } }, // Same count
        c: { dust: { availableCoins: [{}, {}] } }, // Same count
      });

      const wallet = createMockWalletWithDustState(dustState$);

      // Track keys$ access
      const originalKeys$ = keyManager.keys$;
      Object.defineProperty(keyManager, 'keys$', {
        get: () => {
          keysAccessCount++;
          return originalKeys$;
        },
      });

      resetIdleTimerOnDustActivity(wallet, keyManager).subscribe();

      flush();

      // keys$ should NOT be accessed because:
      // - Initial emission is skipped
      // - Subsequent emissions have same count (distinctUntilChanged filters them)
      expect(keysAccessCount).toBe(0);
    });
  });

  it('skips initial emission (restoration, not sync activity)', () => {
    const testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    testScheduler.run(({ cold, flush }) => {
      const keys$Subject = new BehaviorSubject<unknown>({ walletKeys: {} });
      const keyManager = createMockKeyManager(keys$Subject);
      let keysAccessCount = 0;

      // Single emission (initial state only)
      const dustState$ = cold('a|', {
        a: { dust: { availableCoins: [{}, {}, {}] } }, // 3 coins
      });

      const wallet = createMockWalletWithDustState(dustState$);

      // Track keys$ access
      const originalKeys$ = keyManager.keys$;
      Object.defineProperty(keyManager, 'keys$', {
        get: () => {
          keysAccessCount++;
          return originalKeys$;
        },
      });

      resetIdleTimerOnDustActivity(wallet, keyManager).subscribe();

      flush();

      // keys$ should NOT be accessed because initial emission is skipped
      expect(keysAccessCount).toBe(0);
    });
  });

  it('resets idle timer on each distinct change in availableCoins count', () => {
    const testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    testScheduler.run(({ cold, flush }) => {
      const keys$Subject = new BehaviorSubject<unknown>({ walletKeys: {} });
      const keyManager = createMockKeyManager(keys$Subject);
      let keysAccessCount = 0;

      // Multiple distinct changes: 0 -> 1 -> 2 -> 1 coins
      const dustState$ = cold('a-b-c-d', {
        a: { dust: { availableCoins: [] } }, // Initial: 0 (skipped)
        b: { dust: { availableCoins: [{}] } }, // Change: 0 -> 1
        c: { dust: { availableCoins: [{}, {}] } }, // Change: 1 -> 2
        d: { dust: { availableCoins: [{}] } }, // Change: 2 -> 1
      });

      const wallet = createMockWalletWithDustState(dustState$);

      // Track keys$ access
      const originalKeys$ = keyManager.keys$;
      Object.defineProperty(keyManager, 'keys$', {
        get: () => {
          keysAccessCount++;
          return originalKeys$;
        },
      });

      resetIdleTimerOnDustActivity(wallet, keyManager).subscribe();

      flush();

      // keys$ should be accessed 3 times (one for each change after initial)
      expect(keysAccessCount).toBe(3);
    });
  });

  it('does not access keys$ when keys are not available (idle timeout already fired)', () => {
    const testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    testScheduler.run(({ cold, flush }) => {
      const keys$Subject = new BehaviorSubject<unknown>({ walletKeys: {} });
      // areKeysAvailable$ emits false - keys have been cleared
      const keyManager = createMockKeyManager(keys$Subject, of(false));
      let keysAccessCount = 0;

      // Multiple distinct changes: 0 -> 1 -> 2 coins
      const dustState$ = cold('a-b-c', {
        a: { dust: { availableCoins: [] } }, // Initial: 0 (skipped)
        b: { dust: { availableCoins: [{}] } }, // Change: 0 -> 1
        c: { dust: { availableCoins: [{}, {}] } }, // Change: 1 -> 2
      });

      const wallet = createMockWalletWithDustState(dustState$);

      // Track keys$ access
      const originalKeys$ = keyManager.keys$;
      Object.defineProperty(keyManager, 'keys$', {
        get: () => {
          keysAccessCount++;
          return originalKeys$;
        },
      });

      resetIdleTimerOnDustActivity(wallet, keyManager).subscribe();

      flush();

      // keys$ should NOT be accessed because keys are not available
      // This prevents triggering an auth prompt when the idle timeout has already fired
      expect(keysAccessCount).toBe(0);
    });
  });
});

describe('watchMidnightAccounts', () => {
  const previewNetworkId = NetworkId.NetworkId.Preview;
  const undeployedNetworkId = NetworkId.NetworkId.Undeployed;

  const previewNetwork = {
    networkId: previewNetworkId,
    config: { nodeAddress: 'preview-node' } as unknown as MidnightNetworkConfig,
  };

  const undeployedNetwork = {
    networkId: undeployedNetworkId,
    config: {
      nodeAddress: 'undeployed-node',
    } as unknown as MidnightNetworkConfig,
  };

  const midnightAccount1 = {
    ...stubData.midnightAccount,
    accountId: stubData.accountId,
    blockchainSpecific: {
      ...stubData.midnightAccount.blockchainSpecific,
      networkId: previewNetworkId,
    },
  };

  const midnightAccount2 = {
    ...stubData.midnightAccount,
    accountId: (stubData.accountId + '-2') as AccountId,
    blockchainSpecific: {
      ...stubData.midnightAccount.blockchainSpecific,
      networkId: previewNetworkId,
    },
  };

  const midnightAccountDifferentNetwork = {
    ...stubData.midnightAccount,
    accountId: (stubData.accountId + '-undeployed') as AccountId,
    blockchainSpecific: {
      ...stubData.midnightAccount.blockchainSpecific,
      networkId: undeployedNetworkId,
    },
  };

  const cardanoAccount = {
    accountId: 'cardano-account' as AccountId,
    blockchainName: 'Cardano' as const,
    accountType: 'InMemory' as const,
    networkType: 'testnet' as const,
    walletId: stubData.walletId,
  } as InMemoryWalletAccount<MidnightAccountProps>;

  const createMockStore = (): CollectionStorage<SerializedMidnightWallet> =>
    ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      observeAll: vi.fn(),
      setAll: vi.fn(),
    } as CollectionStorage<SerializedMidnightWallet>);

  const logger = dummyLogger;

  describe('initial setup', () => {
    it('starts watching all Midnight accounts matching the current network immediately', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // watchAccount should be called for both accounts
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });
  });

  describe('network changes', () => {
    it('stops all existing watchers when network changes (via switchMap)', () => {
      const mockStore = createMockStore();
      let isWatcherStoppedForMidnightAccount1 = false;
      const mockWatchAccount = vi.fn(
        account => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (account.accountId === midnightAccount1.accountId) {
                isWatcherStoppedForMidnightAccount1 = true;
              }
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                // Network changes from preview to undeployed
                selectCurrentNetwork$: cold('a-b', {
                  a: previewNetwork,
                  b: undeployedNetwork,
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1],
                  b: [midnightAccountDifferentNetwork],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Watcher for midnightAccount1 should have been stopped when network changed
              expect(isWatcherStoppedForMidnightAccount1).toBe(true);
            },
          };
        },
      );
    });

    it('starts watching accounts matching the new network after network change', () => {
      const mockStore = createMockStore();

      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a-b', {
                  a: previewNetwork,
                  b: undeployedNetwork,
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1],
                  b: [midnightAccountDifferentNetwork],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should be called twice: once for midnightAccount1 (preview), once for midnightAccountDifferentNetwork (undeployed)
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccountDifferentNetwork,
                undeployedNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('does not restart watchers if network changes to the same value (distinctUntilChanged)', () => {
      const mockStore = createMockStore();
      // Return never-completing observable to test distinctUntilChanged properly
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            // Never completes - simulates active watcher
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                // Same network emitted multiple times - distinctUntilChanged filters to 1
                selectCurrentNetwork$: cold('a-a-a', { a: previewNetwork }),
              },
              wallets: {
                // Emit once - after distinctUntilChanged on network, only processes once
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should only be called once - distinctUntilChanged on network prevents restart
              expect(mockWatchAccount).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });
  });

  describe('account lifecycle', () => {
    it('starts watching a new account when it appears in the accounts list', () => {
      const mockStore = createMockStore();
      // Return never-completing observable to prevent exhaustMap from allowing duplicates
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            // Never completes - simulates active watcher
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                // Account2 appears in second emission
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1],
                  b: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should be called twice: once for midnightAccount1, once for midnightAccount2
              // exhaustMap prevents midnightAccount1 from starting again when it appears in second emission
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('stops watching an account when it is removed from the accounts list (takeUntil)', () => {
      const mockStore = createMockStore();
      let isWatcherStoppedForAccount2 = false;
      const mockWatchAccount = vi.fn(
        account => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (account.accountId === midnightAccount2.accountId) {
                isWatcherStoppedForAccount2 = true;
              }
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                // Account2 removed in second emission
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1, midnightAccount2],
                  b: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Watcher for midnightAccount2 should have been stopped
              expect(isWatcherStoppedForAccount2).toBe(true);
            },
          };
        },
      );
    });

    it('prevents duplicate watchers for the same account (exhaustMap)', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(
        () => () =>
          // Return a never-completing observable to test exhaustMap
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                // Same account emitted multiple times
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b-c', {
                  a: [midnightAccount1],
                  b: [midnightAccount1],
                  c: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should only be called once due to exhaustMap
              expect(mockWatchAccount).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });
  });

  describe('restart wallet watch', () => {
    it('restarts all watchers when restartWalletWatch$ action is dispatched', () => {
      const mockStore = createMockStore();

      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                // Restart triggered at frame 2
                restartWalletWatch$: cold('--a', {
                  a: actions.midnight.restartWalletWatch(),
                }),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should be called twice: initial + after restart
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
            },
          };
        },
      );
    });

    it('stops existing watchers before restarting (via switchMap)', () => {
      const mockStore = createMockStore();
      let isWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              isWatcherStopped = true;
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('--a', {
                  a: actions.midnight.restartWalletWatch(),
                }),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Watcher should have been stopped before restart
              expect(isWatcherStopped).toBe(true);
            },
          };
        },
      );
    });
  });

  describe('error handling', () => {
    it('does not crash the entire stream when one account watcher fails', () => {
      const mockStore = createMockStore();
      const errorLog = vi.spyOn(logger, 'error');
      const mockWatchAccount = vi.fn(account => () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (account.accountId === midnightAccount1.accountId) {
          return throwError(() => new Error('Watcher failed'));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        return of(actions.sync.addSyncOperation({} as any));
      }) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              const emissions: unknown[] = [];
              sideEffect$.subscribe(action => emissions.push(action));
              flush();
              // Should log error
              expect(errorLog).toHaveBeenCalledWith(
                'Account watch failure:',
                expect.any(Error),
              );
              // Should still process midnightAccount2
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('continues watching other accounts when one account watcher errors', () => {
      const mockStore = createMockStore();
      const mockWatchAccount = vi.fn(account => () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (account.accountId === midnightAccount1.accountId) {
          return throwError(() => new Error('Watcher failed'));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        return of(actions.sync.addSyncOperation({} as any));
      }) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, midnightAccount2],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Both accounts should be processed despite midnightAccount1 error
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
            },
          };
        },
      );
    });
  });

  describe('selectActiveNetworkAccounts$ filtering', () => {
    it('filters out non-Midnight accounts', () => {
      const mockStore = createMockStore();

      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1, cardanoAccount],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should only watch midnight account
              expect(mockWatchAccount).toHaveBeenCalledTimes(1);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('includes all Midnight accounts matching current network', () => {
      const mockStore = createMockStore();

      const mockWatchAccount = vi.fn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        () => () => of(actions.sync.addSyncOperation({} as any)),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [
                    midnightAccount1,
                    midnightAccount2,
                    midnightAccountDifferentNetwork,
                  ],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              // Should watch both preview network accounts
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount1,
                previewNetwork.config,
                mockStore,
              );
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });
  });

  describe('integration scenarios', () => {
    it('handles sequence: add account -> watch starts -> remove account -> watch stops', () => {
      const mockStore = createMockStore();
      let isWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        account => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (account.accountId === midnightAccount2.accountId) {
                isWatcherStopped = true;
              }
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                // Add midnightAccount2, then remove it
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b-c', {
                  a: [midnightAccount1],
                  b: [midnightAccount1, midnightAccount2],
                  c: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccount2,
                previewNetwork.config,
                mockStore,
              );
              expect(isWatcherStopped).toBe(true);
            },
          };
        },
      );
    });

    it('handles sequence: watch active -> network change -> old watch stops -> new watch starts', () => {
      const mockStore = createMockStore();
      let isPreviewWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        account => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (account.accountId === midnightAccount1.accountId) {
                isPreviewWatcherStopped = true;
              }
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('---'),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a-b', {
                  a: previewNetwork,
                  b: undeployedNetwork,
                }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a-b', {
                  a: [midnightAccount1],
                  b: [midnightAccountDifferentNetwork],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(isPreviewWatcherStopped).toBe(true);
              expect(mockWatchAccount).toHaveBeenCalledWith(
                midnightAccountDifferentNetwork,
                undeployedNetwork.config,
                mockStore,
              );
            },
          };
        },
      );
    });

    it('handles sequence: watch active -> restart trigger -> watch stops -> watch restarts', () => {
      const mockStore = createMockStore();
      let isWatcherStopped = false;
      const mockWatchAccount = vi.fn(
        () => () =>
          new Observable(subscriber => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            subscriber.next(actions.sync.addSyncOperation({} as any));
            return () => {
              isWatcherStopped = true;
            };
          }),
      ) as typeof watchMidnightAccount;

      testSideEffect(
        watchMidnightAccounts(mockStore, mockWatchAccount),
        ({ cold, flush }) => {
          return {
            actionObservables: {
              midnight: {
                restartWalletWatch$: cold('--a', {
                  a: actions.midnight.restartWalletWatch(),
                }),
              },
            },
            stateObservables: {
              midnightContext: {
                selectCurrentNetwork$: cold('a', { a: previewNetwork }),
              },
              wallets: {
                selectIsWalletRepoMigrating$: cold('a', { a: false }),
                selectActiveNetworkAccounts$: cold('a', {
                  a: [midnightAccount1],
                }),
              },
            },
            dependencies: {
              actions,
              logger,
            },
            assertion: sideEffect$ => {
              sideEffect$.subscribe();
              flush();
              expect(isWatcherStopped).toBe(true);
              expect(mockWatchAccount).toHaveBeenCalledTimes(2);
            },
          };
        },
      );
    });
  });
});
