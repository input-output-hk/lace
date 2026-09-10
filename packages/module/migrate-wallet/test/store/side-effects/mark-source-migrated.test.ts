import {
  AccountId,
  WalletId,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeMarkSourceMigrated } from '../../../src/store/side-effects/mark-source-migrated';

import type { AnyWallet } from '@lace-contract/wallet-repo';

const sourceWalletId = WalletId('source-wallet');
const account0Id = AccountId('source-0');
const account1Id = AccountId('source-1');

const NOW = Timestamp(1_700_000_000_000);
const EARLIER = Timestamp(1_600_000_000_000);

const account = (
  accountId: AccountId,
  options: {
    networkType?: 'mainnet' | 'testnet';
    migratedOutAt?: Timestamp;
    blockchainName?: string;
    accountIndex?: number;
  } = {},
) => ({
  accountId,
  walletId: sourceWalletId,
  networkType: options.networkType ?? 'mainnet',
  blockchainName: options.blockchainName ?? 'Cardano',
  blockchainSpecific: {
    accountIndex: options.accountIndex ?? (accountId === account0Id ? 0 : 1),
  },
  metadata: {
    name: 'My account',
    ...(options.migratedOutAt !== undefined && {
      migratedOutAt: options.migratedOutAt,
    }),
  },
});

const wallet = (
  accounts: ReturnType<typeof account>[],
  migratedOutAt?: Timestamp,
): AnyWallet =>
  ({
    walletId: sourceWalletId,
    metadata: {
      name: 'My wallet',
      order: 0,
      ...(migratedOutAt !== undefined && { migratedOutAt }),
    },
    accounts,
  } as unknown as AnyWallet);

// Indexes follow the fixture ids: source-0 -> 0, source-1 -> 1.
const plan = (accountIds: AccountId[]) =>
  ({
    signingAccounts: accountIds.map(accountId => ({
      accountId,
      accountIndex: accountId === account0Id ? 0 : 1,
    })),
  } as never);

const sweepSucceeded = {
  type: 'migrateWallet/sweepSucceeded',
  payload: { txId: 'tx1' },
};

const run = ({
  sweepMarble = '-a',
  chunkMarble = '--',
  chunkValues,
  sourceWallet,
  sweptAccountIds,
  walletId = sourceWalletId,
  sourceNetworkType = 'mainnet',
  scannedThroughAccountIndex = 1,
  migrationMode,
  accountMapping,
  assertion,
}: {
  sweepMarble?: string;
  chunkMarble?: string;
  chunkValues?: Record<string, unknown>;
  sourceWallet: AnyWallet | undefined;
  sweptAccountIds: AccountId[] | undefined;
  walletId?: WalletId | null;
  sourceNetworkType?: 'mainnet' | 'testnet';
  scannedThroughAccountIndex?: number;
  migrationMode?: 'consolidate' | 'preserve';
  accountMapping?: {
    sourceAccountIndex: number;
    utxoCount: number;
    canFundOwnTransaction?: boolean;
  }[];
  assertion: (emissions: { type: string; payload?: unknown }[]) => void;
}) => {
  testSideEffect(makeMarkSourceMigrated(), ({ hot, cold, flush }) => ({
    actionObservables: {
      migrateWallet: {
        sweepSucceeded$: hot(sweepMarble, { a: sweepSucceeded }) as never,
        sweepChunkSubmitted$: hot(chunkMarble, chunkValues) as never,
      },
    },
    stateObservables: {
      migrateWallet: {
        selectSourceWalletId$: cold('a', { a: walletId }) as never,
        selectReviewedSweepPlan$: cold('a', {
          a: sweptAccountIds && plan(sweptAccountIds),
        }),
        selectMigrationMode$: cold('a', { a: migrationMode }) as never,
        selectSourceNetworkType$: cold('a', {
          a: sourceNetworkType,
        }) as never,
        selectDiscovery$: cold('a', {
          a: { scannedThroughAccountIndex },
        }) as never,
        selectAccountMapping$: cold('a', { a: accountMapping }) as never,
      },
      wallets: {
        selectWalletById$: cold('a', {
          a: (id: WalletId) =>
            id === sourceWalletId ? sourceWallet : undefined,
        }) as never,
      },
    },
    dependencies: { actions: walletsActions },
    assertion: sideEffect$ => {
      const emissions: { type: string; payload?: unknown }[] = [];
      sideEffect$.subscribe(action => emissions.push(action));
      flush();
      assertion(emissions);
    },
  }));
};

describe('makeMarkSourceMigrated', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Number(NOW));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stamps the wallet and every account when the whole wallet was swept', () => {
    run({
      sourceWallet: wallet([account(account0Id), account(account1Id)]),
      sweptAccountIds: [account0Id, account1Id],
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: NOW }),
                account(account1Id, { migratedOutAt: NOW }),
              ],
              metadata: { name: 'My wallet', order: 0, migratedOutAt: NOW },
            } as never,
          }),
        ]);
      },
    });
  });

  it('stamps only the swept accounts and keeps the wallet unstamped when a preserve sweep leaves one behind', () => {
    run({
      sourceWallet: wallet([account(account0Id), account(account1Id)]),
      sweptAccountIds: [account0Id],
      migrationMode: 'preserve',
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: NOW }),
                account(account1Id),
              ],
            } as never,
          }),
        ]);
      },
    });
  });

  it('stamps the wallet when only the other network tier’s twin accounts are unswept', () => {
    // Accounts fan out per network: a mainnet wallet carries testnet twins no
    // sweep touches. They must not hold the wallet-level stamp hostage.
    const testnetTwin = account(AccountId('source-0-testnet'), {
      networkType: 'testnet',
    });
    run({
      sourceWallet: wallet([account(account0Id), testnetTwin]),
      sweptAccountIds: [account0Id],
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: NOW }),
                testnetTwin,
              ],
              metadata: { name: 'My wallet', order: 0, migratedOutAt: NOW },
            } as never,
          }),
        ]);
      },
    });
  });

  it('stamps the wallet in consolidate mode despite a zero-balance account the plan omitted', () => {
    // The plan signs only accounts with sweepable value; a never-funded
    // account holds nothing and must not block the wallet-level stamp.
    const emptyAccount = account(account1Id);
    run({
      sourceWallet: wallet([account(account0Id), emptyAccount]),
      sweptAccountIds: [account0Id],
      migrationMode: 'consolidate',
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: NOW }),
                emptyAccount,
              ],
              metadata: { name: 'My wallet', order: 0, migratedOutAt: NOW },
            } as never,
          }),
        ]);
      },
    });
  });

  it('blocks the wallet stamp in consolidate mode when another blockchain still holds funds', () => {
    // This tool never moves non-Cardano funds; a wallet-level marker over a
    // live Bitcoin account would overstate.
    const bitcoinAccount = account(AccountId('source-btc-0'), {
      blockchainName: 'Bitcoin',
    });
    run({
      sourceWallet: wallet([account(account0Id), bitcoinAccount]),
      sweptAccountIds: [account0Id],
      migrationMode: 'consolidate',
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: NOW }),
                bitcoinAccount,
              ],
            } as never,
          }),
        ]);
      },
    });
  });

  it('counts an already-stamped account toward the wallet stamp on a later preserve sweep', () => {
    // Migration #1 stamped account 0; migration #2 sweeps account 1 — every
    // tier account is now stamped, so the wallet finally is too.
    run({
      sourceWallet: wallet([
        account(account0Id, { migratedOutAt: EARLIER }),
        account(account1Id),
      ]),
      sweptAccountIds: [account1Id],
      migrationMode: 'preserve',
      accountMapping: [
        { sourceAccountIndex: 1, utxoCount: 2, canFundOwnTransaction: true },
      ],
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: EARLIER }),
                account(account1Id, { migratedOutAt: NOW }),
              ],
              metadata: { name: 'My wallet', order: 0, migratedOutAt: NOW },
            } as never,
          }),
        ]);
      },
    });
  });

  it('keeps a preserve-mode account the sweep refused unstamped, and the wallet with it', () => {
    // The plan signs for every scanned account, but preserve mode migrates
    // only the rows that can fund their own transaction — a rewards-only
    // account is retained and must not read as migrated.
    run({
      sourceWallet: wallet([account(account0Id), account(account1Id)]),
      sweptAccountIds: [account0Id, account1Id],
      migrationMode: 'preserve',
      accountMapping: [
        { sourceAccountIndex: 0, utxoCount: 3, canFundOwnTransaction: true },
        { sourceAccountIndex: 1, utxoCount: 0, canFundOwnTransaction: false },
      ],
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: NOW }),
                account(account1Id),
              ],
            } as never,
          }),
        ]);
      },
    });
  });

  it('keeps the FIRST migration’s stamp when a re-migration sweeps an already-stamped account', () => {
    run({
      sourceWallet: wallet(
        [account(account0Id, { migratedOutAt: EARLIER }), account(account1Id)],
        EARLIER,
      ),
      sweptAccountIds: [account0Id, account1Id],
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: EARLIER }),
                account(account1Id, { migratedOutAt: NOW }),
              ],
            } as never,
          }),
        ]);
      },
    });
  });

  it('blocks the wallet stamp when a Cardano account past the scan horizon was never swept', () => {
    // An off-plan account WITHIN the horizon was scanned and found empty; one
    // BEYOND it was never scanned at all and may hold funds.
    const beyondHorizon = account(AccountId('source-9'), { accountIndex: 9 });
    run({
      sourceWallet: wallet([account(account0Id), beyondHorizon]),
      sweptAccountIds: [account0Id],
      migrationMode: 'consolidate',
      scannedThroughAccountIndex: 3,
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: NOW }),
                beyondHorizon,
              ],
            } as never,
          }),
        ]);
      },
    });
  });

  it('stamps a chunk’s source account the moment its transaction is submitted', () => {
    // A preserve sweep that pauses after this chunk and is never resumed must
    // still leave the emptied account marked.
    run({
      sweepMarble: '--',
      chunkMarble: '-c',
      chunkValues: {
        c: {
          type: 'migrateWallet/sweepChunkSubmitted',
          payload: {
            index: 0,
            txId: 'tx1',
            totalChunks: 2,
            sourceAccountIndex: 0,
          },
        },
      },
      sourceWallet: wallet([account(account0Id), account(account1Id)]),
      sweptAccountIds: [account0Id, account1Id],
      assertion: emissions => {
        expect(emissions).toEqual([
          walletsActions.wallets.updateWallet({
            id: sourceWalletId,
            changes: {
              accounts: [
                account(account0Id, { migratedOutAt: NOW }),
                account(account1Id),
              ],
            } as never,
          }),
        ]);
      },
    });
  });

  it('ignores a chunk without a source account index or already stamped', () => {
    run({
      sweepMarble: '---',
      chunkMarble: '-cd',
      chunkValues: {
        c: {
          type: 'migrateWallet/sweepChunkSubmitted',
          payload: { index: 0, txId: 'tx1', totalChunks: 2 },
        },
        d: {
          type: 'migrateWallet/sweepChunkSubmitted',
          payload: {
            index: 1,
            txId: 'tx2',
            totalChunks: 2,
            sourceAccountIndex: 0,
          },
        },
      },
      sourceWallet: wallet([account(account0Id, { migratedOutAt: EARLIER })]),
      sweptAccountIds: [account0Id],
      assertion: emissions => {
        expect(emissions).toHaveLength(0);
      },
    });
  });

  it('dispatches nothing when every stamp is already in place', () => {
    run({
      sourceWallet: wallet(
        [account(account0Id, { migratedOutAt: EARLIER })],
        EARLIER,
      ),
      sweptAccountIds: [account0Id],
      assertion: emissions => {
        expect(emissions).toHaveLength(0);
      },
    });
  });

  it.each([
    ['no reviewed plan', { sweptAccountIds: undefined }],
    ['no source wallet id', { walletId: null }],
  ] as const)('dispatches nothing with %s', (_case, overrides) => {
    run({
      sourceWallet: wallet([account(account0Id)]),
      sweptAccountIds: [account0Id],
      ...overrides,
      assertion: emissions => {
        expect(emissions).toHaveLength(0);
      },
    });
  });

  it('dispatches nothing when the source wallet is no longer in the repo', () => {
    run({
      sourceWallet: undefined,
      sweptAccountIds: [account0Id],
      assertion: emissions => {
        expect(emissions).toHaveLength(0);
      },
    });
  });

  it('dispatches nothing without a sweep completion', () => {
    run({
      sweepMarble: '--',
      sourceWallet: wallet([account(account0Id)]),
      sweptAccountIds: [account0Id],
      assertion: emissions => {
        expect(emissions).toHaveLength(0);
      },
    });
  });
});
