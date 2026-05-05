import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      getKeys: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('../../src/store/v1-data/prepare-preloaded-state', () => ({
  preparePreloadedState: vi.fn().mockResolvedValue({
    state: { wallets: { entities: {} } },
    inMemoryWalletIds: [],
  }),
}));

import {
  deleteWalletSideEffect,
  wizardMountedSideEffect,
} from '../../src/store/side-effects';
import { migrateV1Actions } from '../../src/store/slice';
import { preparePreloadedState } from '../../src/store/v1-data/prepare-preloaded-state';

import type { AnyWallet, InMemoryWallet } from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-sdk/util';

const walletId1 = WalletId('wallet-1');
const accountId1 = AccountId('account-1');
const accountId2 = AccountId('account-2');

const createInMemoryWallet = (
  walletId: WalletId,
  phrase = 'encrypted-phrase-hex' as HexBytes,
): InMemoryWallet => ({
  type: WalletType.InMemory,
  walletId,
  encryptedRecoveryPhrase: phrase,
  blockchainSpecific: {
    Cardano: { encryptedRootPrivateKey: 'encrypted-key-hex' as HexBytes },
  },
  accounts: [
    {
      accountId: AccountId(`${walletId}-account`),
      walletId,
      accountType: 'InMemory',
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      blockchainNetworkId: 'cardano-mainnet' as never,
      metadata: { name: 'Account 1' },
      blockchainSpecific: {},
    },
  ],
  metadata: { name: 'Test Wallet', order: 0 },
  isPassphraseConfirmed: true,
});

const actions = {
  ...migrateV1Actions,
  wallets: {
    removeWallet: vi.fn((wId: WalletId, aIds: AccountId[]) => ({
      type: 'wallets/removeWallet' as const,
      payload: { walletId: wId, accountIds: aIds },
    })),
    addWallet: vi.fn((wallet: unknown) => ({
      type: 'wallets/addWallet' as const,
      payload: wallet,
    })),
    setIsWalletRepoMigrating: vi.fn((payload: boolean) => ({
      type: 'wallets/setIsWalletRepoMigrating' as const,
      payload,
    })),
  },
  views: {
    openView: vi.fn((payload: { type: string; location: string }) => ({
      type: 'views/openView' as const,
      payload,
    })),
  },
  appLock: {
    reset: vi.fn(() => ({ type: 'appLock/reset' as const })),
  },
};

const selectWalletByIdFunction =
  (walletMap: Record<string, AnyWallet | undefined>) => (id: string) =>
    walletMap[id];

describe('migrate-v1-data side effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteWalletSideEffect', () => {
    it('dispatches removeWallet with correct walletId and accountIds', () => {
      const wallet1 = createInMemoryWallet(walletId1);
      wallet1.accounts = [
        {
          accountId: accountId1,
          walletId: walletId1,
          accountType: 'InMemory',
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          blockchainNetworkId: 'cardano-mainnet' as never,
          metadata: { name: 'Account 1' },
          blockchainSpecific: {},
        },
        {
          accountId: accountId2,
          walletId: walletId1,
          accountType: 'InMemory',
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          blockchainNetworkId: 'cardano-mainnet' as never,
          metadata: { name: 'Account 2' },
          blockchainSpecific: {},
        },
      ];

      testSideEffect(deleteWalletSideEffect, ({ hot, flush }) => ({
        actionObservables: {
          migrateV1: {
            walletDeleted$: hot('-a', {
              a: actions.migrateV1.walletDeleted(walletId1),
            }),
          },
        },
        stateObservables: {
          wallets: {
            selectWalletById$: of(
              selectWalletByIdFunction({ [walletId1]: wallet1 }),
            ),
          },
        },
        dependencies: { actions } as never,
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toHaveLength(1);
          expect(actions.wallets.removeWallet).toHaveBeenCalledWith(walletId1, [
            accountId1,
            accountId2,
          ]);
        },
      }));
    });

    it('emits nothing when wallet is not found', () => {
      testSideEffect(deleteWalletSideEffect, ({ hot, flush }) => ({
        actionObservables: {
          migrateV1: {
            walletDeleted$: hot('-a', {
              a: actions.migrateV1.walletDeleted(walletId1),
            }),
          },
        },
        stateObservables: {
          wallets: {
            selectWalletById$: of(selectWalletByIdFunction({})),
          },
        },
        dependencies: { actions } as never,
        assertion: sideEffect$ => {
          const emissions: unknown[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          expect(emissions).toHaveLength(0);
        },
      }));
    });
  });

  describe('wizardMountedSideEffect', () => {
    const collectEmissions = async (sideEffect$: {
      subscribe: (observer: {
        next: (action: unknown) => void;
        complete: () => void;
      }) => unknown;
    }) => {
      const emissions: Array<{ type: string }> = [];
      await new Promise<void>(resolve => {
        sideEffect$.subscribe({
          next: action => {
            emissions.push(action as { type: string });
          },
          complete: () => {
            resolve();
          },
        });
      });
      return emissions;
    };

    const runWizardMounted = (overrides: {
      status: 'activating' | 'pending';
      pending: WalletId[];
      initialCount: number;
    }) =>
      wizardMountedSideEffect(
        {
          migrateV1: {
            wizardMounted$: of(actions.migrateV1.wizardMounted()),
          },
        } as never,
        {
          migrateV1: {
            selectPasswordMigrationStatus$: of(overrides.status),
            selectWalletsPendingActivation$: of(overrides.pending),
            selectInitialWalletCount$: of(overrides.initialCount),
          },
          wallets: { selectAll$: of([]) },
        } as never,
        { actions } as never,
      );

    it('emits appLock.reset alongside passwordMigrationDetected on a non-fresh-first mount', async () => {
      const sideEffect$ = runWizardMounted({
        status: 'activating',
        pending: [],
        initialCount: 0,
      });
      const emissions = await collectEmissions(sideEffect$);
      const types = emissions.map(emission => emission.type);
      expect(types).toContain('migrateV1/passwordMigrationDetected');
      expect(types).toContain('appLock/reset');
      expect(actions.appLock.reset).toHaveBeenCalledTimes(1);
    });

    it('skips emission on a fresh first mount', async () => {
      const wId = WalletId('w1');
      const sideEffect$ = runWizardMounted({
        status: 'pending',
        pending: [wId],
        initialCount: 1,
      });
      const emissions = await collectEmissions(sideEffect$);
      expect(emissions).toHaveLength(0);
      expect(actions.appLock.reset).not.toHaveBeenCalled();
      expect(preparePreloadedState).not.toHaveBeenCalled();
    });
  });
});
