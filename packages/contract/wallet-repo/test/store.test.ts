import { BlockchainNetworkId } from '@lace-contract/network';
import { HexBytes } from '@lace-sdk/util';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  WalletId,
  walletsActions as actions,
  walletsSelectors as selectors,
  WalletType,
  AccountId,
} from '../src';
import { walletsReducers } from '../src/store/init';

import type {
  InMemoryWallet,
  HardwareWallet,
  HardwareWalletAccount,
} from '../src';
import type { State } from '@lace-contract/module';

const createHwAccount = (
  walletId: string,
  accountIndex: number,
): HardwareWalletAccount => ({
  accountType: 'HardwareLedger',
  accountId: AccountId('hw' + accountIndex),
  networkType: 'testnet',
  blockchainNetworkId: BlockchainNetworkId('cardano-1'),
  walletId: WalletId(walletId),
  blockchainName: 'Cardano',
  blockchainSpecific: {},
  metadata: { name: `Wallet ${walletId} Account #${accountIndex}` },
});

const storedHardwareWallet: HardwareWallet = {
  accounts: [createHwAccount('wallet1', 0)],
  metadata: { name: 'My Ledger Wallet', order: 0 },
  blockchainSpecific: {},
  type: WalletType.HardwareLedger,
  walletId: WalletId('wallet1'),
};

const newHardwareWallet: HardwareWallet = {
  accounts: [createHwAccount('wallet2', 1)],
  metadata: { name: 'My New Ledger Wallet', order: 1 },
  blockchainSpecific: {},
  type: WalletType.HardwareLedger,
  walletId: WalletId('wallet2'),
};

const newMidnightWallet: InMemoryWallet = {
  accounts: [
    {
      blockchainName: 'Midnight',
      networkType: 'testnet',
      blockchainNetworkId: BlockchainNetworkId('midnight-preview'),
      metadata: { name: 'MN' },
      walletId: WalletId('Midnight'),
      blockchainSpecific: {},
      accountId: AccountId('mn1'),
      accountType: 'InMemory',
    },
  ],
  blockchainSpecific: {},
  metadata: { name: 'My New Ledger Wallet', order: 1 },
  type: WalletType.InMemory as const,
  walletId: WalletId('Midnight'),
  encryptedRecoveryPhrase: HexBytes('0'.repeat(64)),
  isPassphraseConfirmed: false,
};

describe('wallets/slice', () => {
  let initialState: State['wallets'];

  beforeEach(() => {
    initialState = {
      ids: [],
      entities: {},
      isWalletRepoMigrating: false,
      activeAccountContext: null,
    };
  });

  describe('wallets reducers', () => {
    describe('removeWallet', () => {
      it('should remove the wallet from the repository', () => {
        initialState = {
          ids: [storedHardwareWallet.walletId],
          entities: {
            [storedHardwareWallet.walletId]: storedHardwareWallet,
          },
          isWalletRepoMigrating: false,
          activeAccountContext: {
            walletId: storedHardwareWallet.walletId,
            accountId: storedHardwareWallet.accounts[0].accountId,
          },
        };
        const newState = walletsReducers.wallets(
          initialState,
          actions.wallets.removeWallet(storedHardwareWallet.walletId, [
            storedHardwareWallet.accounts[0].accountId,
          ]),
        );
        expect(newState.ids).toEqual([]);
        expect(newState.entities[WalletId('wallet1')]).toBeUndefined();
      });
    });

    describe('addWallet', () => {
      it('should add the wallet to the repository', () => {
        initialState = {
          ids: [],
          entities: {},
          isWalletRepoMigrating: false,
          activeAccountContext: null,
        };
        const newState = walletsReducers.wallets(
          initialState,
          actions.wallets.addWallet(storedHardwareWallet),
        );
        expect(newState.ids).toEqual(['wallet1']);
        expect(newState.entities[WalletId('wallet1')]).toEqual(
          storedHardwareWallet,
        );
      });
    });

    describe('removeAccount', () => {
      it('should remove the account from the wallet', () => {
        const walletWithMultipleAccounts = {
          ...storedHardwareWallet,
          accounts: [
            createHwAccount('wallet1', 0),
            createHwAccount('wallet1', 1),
            createHwAccount('wallet1', 2),
          ],
        };
        initialState = {
          ids: [walletWithMultipleAccounts.walletId],
          entities: {
            [walletWithMultipleAccounts.walletId]: walletWithMultipleAccounts,
          },
          isWalletRepoMigrating: false,
          activeAccountContext: {
            walletId: walletWithMultipleAccounts.walletId,
            accountId: walletWithMultipleAccounts.accounts[0].accountId,
          },
        };
        const accountToRemove = walletWithMultipleAccounts.accounts[1];
        const newState = walletsReducers.wallets(
          initialState,
          actions.wallets.removeAccount(
            walletWithMultipleAccounts.walletId,
            accountToRemove.accountId,
          ),
        );
        expect(newState.ids).toEqual([walletWithMultipleAccounts.walletId]);
        expect(
          newState.entities[walletWithMultipleAccounts.walletId].accounts,
        ).toHaveLength(2);
        expect(
          newState.entities[walletWithMultipleAccounts.walletId].accounts,
        ).not.toContainEqual(accountToRemove);
        expect(
          newState.entities[walletWithMultipleAccounts.walletId].accounts,
        ).toContainEqual(walletWithMultipleAccounts.accounts[0]);
        expect(
          newState.entities[walletWithMultipleAccounts.walletId].accounts,
        ).toContainEqual(walletWithMultipleAccounts.accounts[2]);
      });

      it('should remove the wallet when its last account is removed', () => {
        const walletWithSingleAccount = {
          ...storedHardwareWallet,
          accounts: [createHwAccount('wallet1', 0)],
        };
        initialState = {
          ids: [walletWithSingleAccount.walletId],
          entities: {
            [walletWithSingleAccount.walletId]: walletWithSingleAccount,
          },
          isWalletRepoMigrating: false,
          activeAccountContext: {
            walletId: walletWithSingleAccount.walletId,
            accountId: walletWithSingleAccount.accounts[0].accountId,
          },
        };
        const accountToRemove = walletWithSingleAccount.accounts[0];
        const newState = walletsReducers.wallets(
          initialState,
          actions.wallets.removeAccount(
            walletWithSingleAccount.walletId,
            accountToRemove.accountId,
          ),
        );
        expect(newState.ids).toEqual([]);
        expect(
          newState.entities[walletWithSingleAccount.walletId],
        ).toBeUndefined();
        expect(newState.activeAccountContext).toBeNull();
      });

      it('should only remove the emptied wallet when other wallets remain', () => {
        const walletToKeep = {
          ...storedHardwareWallet,
          walletId: WalletId('keep-wallet'),
          accounts: [createHwAccount('keep-wallet', 0)],
          metadata: { ...storedHardwareWallet.metadata, order: 0 },
        };
        const walletToRemove = {
          ...storedHardwareWallet,
          walletId: WalletId('remove-wallet'),
          accounts: [createHwAccount('remove-wallet', 1)],
          metadata: { ...storedHardwareWallet.metadata, order: 1 },
        };
        initialState = {
          ids: [walletToKeep.walletId, walletToRemove.walletId],
          entities: {
            [walletToKeep.walletId]: walletToKeep,
            [walletToRemove.walletId]: walletToRemove,
          },
          isWalletRepoMigrating: false,
          activeAccountContext: {
            walletId: walletToKeep.walletId,
            accountId: walletToKeep.accounts[0].accountId,
          },
        };
        const newState = walletsReducers.wallets(
          initialState,
          actions.wallets.removeAccount(
            walletToRemove.walletId,
            walletToRemove.accounts[0].accountId,
          ),
        );
        expect(newState.ids).toEqual([walletToKeep.walletId]);
        expect(newState.entities[walletToKeep.walletId]).toEqual(walletToKeep);
        expect(newState.entities[walletToRemove.walletId]).toBeUndefined();
        expect(newState.activeAccountContext).toEqual({
          walletId: walletToKeep.walletId,
          accountId: walletToKeep.accounts[0].accountId,
        });
      });

      it('should not modify wallet if account does not exist', () => {
        initialState = {
          ids: [storedHardwareWallet.walletId],
          entities: {
            [storedHardwareWallet.walletId]: storedHardwareWallet,
          },
          isWalletRepoMigrating: false,
          activeAccountContext: {
            walletId: storedHardwareWallet.walletId,
            accountId: storedHardwareWallet.accounts[0].accountId,
          },
        };
        const nonExistentAccountId = AccountId('non-existent');
        const newState = walletsReducers.wallets(
          initialState,
          actions.wallets.removeAccount(
            storedHardwareWallet.walletId,
            nonExistentAccountId,
          ),
        );
        expect(newState.ids).toEqual([storedHardwareWallet.walletId]);
        expect(newState.entities[storedHardwareWallet.walletId]).toEqual(
          storedHardwareWallet,
        );
      });
    });
  });

  describe('updateWallet', () => {
    const newMetadata = {
      ...storedHardwareWallet.metadata,
      config: { test: 'test' },
    };
    const updateMetadataPayload = {
      id: storedHardwareWallet.walletId,
      metadata: newMetadata,
    };
    it('should update the wallet in the repository', () => {
      initialState = {
        ids: [storedHardwareWallet.walletId],
        entities: {
          [storedHardwareWallet.walletId]: storedHardwareWallet,
        },
        isWalletRepoMigrating: false,
        activeAccountContext: {
          walletId: storedHardwareWallet.walletId,
          accountId: storedHardwareWallet.accounts[0].accountId,
        },
      };
      const entityMetadataUpdatePayload = {
        id: updateMetadataPayload.id,
        changes: {
          metadata: updateMetadataPayload.metadata,
        },
      };
      const newState = walletsReducers.wallets(
        initialState,
        actions.wallets.updateWallet(entityMetadataUpdatePayload),
      );
      expect(newState.ids).toEqual([storedHardwareWallet.walletId]);
      expect(newState.entities[storedHardwareWallet.walletId]).toEqual({
        ...storedHardwareWallet,
        metadata: newMetadata,
      });
    });
  });

  describe('setActiveAccountContext', () => {
    it('should set the active wallet context', () => {
      initialState = {
        ids: [storedHardwareWallet.walletId],
        entities: {
          [storedHardwareWallet.walletId]: storedHardwareWallet,
        },
        isWalletRepoMigrating: false,
        activeAccountContext: null,
      };
      const newContext = {
        walletId: storedHardwareWallet.walletId,
        accountId: storedHardwareWallet.accounts[0].accountId,
      };
      const newState = walletsReducers.wallets(
        initialState,
        actions.wallets.setActiveAccountContext(newContext),
      );
      expect(newState.activeAccountContext).toEqual(newContext);
    });
  });

  describe('clearActiveAccountContext', () => {
    it('should clear the active wallet context', () => {
      initialState = {
        ids: [storedHardwareWallet.walletId],
        entities: {
          [storedHardwareWallet.walletId]: storedHardwareWallet,
        },
        isWalletRepoMigrating: false,
        activeAccountContext: {
          walletId: storedHardwareWallet.walletId,
          accountId: storedHardwareWallet.accounts[0].accountId,
        },
      };
      const newState = walletsReducers.wallets(
        initialState,
        actions.wallets.clearActiveAccountContext(),
      );
      expect(newState.activeAccountContext).toBeNull();
    });
  });

  describe('selectors', () => {
    const state = {
      wallets: {
        entities: {
          [storedHardwareWallet.walletId]: storedHardwareWallet,
          [newHardwareWallet.walletId]: newHardwareWallet,
          [newMidnightWallet.walletId]: newMidnightWallet,
        },
        ids: [
          storedHardwareWallet.walletId,
          newHardwareWallet.walletId,
          newMidnightWallet.walletId,
        ],
        isWalletRepoMigrating: false,
        activeAccountContext: {
          walletId: storedHardwareWallet.walletId,
          accountId: storedHardwareWallet.accounts[0].accountId,
        },
      },
      network: {
        networkType: 'testnet',
        blockchainNetworks: {
          Cardano: {
            mainnet: BlockchainNetworkId('cardano-mainnet'),
            testnet: BlockchainNetworkId('cardano-1'),
          },
          Midnight: {
            mainnet: BlockchainNetworkId('midnight-mainnet'),
            testnet: BlockchainNetworkId('midnight-preview'),
          },
        },
        testnetOptions: {},
      },
    } as State;

    describe('selectAll', () => {
      it('should return all wallets', () => {
        const allWallets = selectors.wallets.selectAll(state);
        expect(
          [storedHardwareWallet, newHardwareWallet, newMidnightWallet].every(
            w =>
              allWallets.some(
                selectedWallet => selectedWallet.walletId === w.walletId,
              ),
          ),
        ).toBe(true);
      });
    });

    describe('selectActiveNetworkAccounts', () => {
      it('returns a flat array of all wallet accounts', () => {
        const allAccounts =
          selectors.wallets.selectActiveNetworkAccounts(state);
        expect(
          [
            storedHardwareWallet.accounts,
            newHardwareWallet.accounts,
            newMidnightWallet.accounts,
          ]
            .flat()
            .every(a =>
              allAccounts.some(
                selectedAccount => selectedAccount.accountId === a.accountId,
              ),
            ),
        ).toBe(true);
      });
    });

    describe('selectActiveNetworkAccountsByBlockchainName', () => {
      it('returns only Cardano accounts when filtering by Cardano', () => {
        const cardanoAccounts =
          selectors.wallets.selectActiveNetworkAccountsByBlockchainName(state, {
            blockchainName: 'Cardano',
          });
        expect(cardanoAccounts).toHaveLength(2);
        expect(
          cardanoAccounts.every(
            account => account.blockchainName === 'Cardano',
          ),
        ).toBe(true);
        expect(
          cardanoAccounts.some(
            account =>
              account.accountId === storedHardwareWallet.accounts[0].accountId,
          ),
        ).toBe(true);
        expect(
          cardanoAccounts.some(
            account =>
              account.accountId === newHardwareWallet.accounts[0].accountId,
          ),
        ).toBe(true);
      });

      it('returns only Midnight accounts when filtering by Midnight', () => {
        const midnightAccounts =
          selectors.wallets.selectActiveNetworkAccountsByBlockchainName(state, {
            blockchainName: 'Midnight',
          });
        expect(midnightAccounts).toHaveLength(1);
        expect(midnightAccounts[0].blockchainName).toBe('Midnight');
        expect(midnightAccounts[0].accountId).toBe(
          newMidnightWallet.accounts[0].accountId,
        );
      });

      it('returns empty array when filtering by a blockchain with no accounts', () => {
        const bitcoinAccounts =
          selectors.wallets.selectActiveNetworkAccountsByBlockchainName(state, {
            blockchainName: 'Bitcoin',
          });
        expect(bitcoinAccounts).toHaveLength(0);
        expect(bitcoinAccounts).toEqual([]);
      });
    });

    describe('selectAccountNamesByNetworkId', () => {
      it('returns display names for accounts on the given network only', () => {
        const namesOnCardano1 = selectors.wallets.selectAccountNamesByNetworkId(
          state,
          BlockchainNetworkId('cardano-1'),
        );
        expect(namesOnCardano1).toEqual([
          storedHardwareWallet.accounts[0].metadata.name,
          newHardwareWallet.accounts[0].metadata.name,
        ]);
      });

      it('returns names for a single-account network', () => {
        const namesOnMidnight = selectors.wallets.selectAccountNamesByNetworkId(
          state,
          BlockchainNetworkId('midnight-preview'),
        );
        expect(namesOnMidnight).toEqual([
          newMidnightWallet.accounts[0].metadata.name,
        ]);
      });

      it('returns empty array when blockchainNetworkId is undefined', () => {
        const names = selectors.wallets.selectAccountNamesByNetworkId(state);
        expect(names).toEqual([]);
      });

      it('returns empty array when no accounts use that network id', () => {
        const names = selectors.wallets.selectAccountNamesByNetworkId(
          state,
          BlockchainNetworkId('cardano-mainnet'),
        );
        expect(names).toEqual([]);
      });
    });

    describe('selectAccountById', () => {
      it('should return the account by id', () => {
        const account = selectors.wallets.selectAccountById(state, {
          accountId: 'hw0',
          walletId: 'wallet1',
        });
        expect(account).toEqual(storedHardwareWallet.accounts[0]);
      });

      it('should return undefined if the account is not found', () => {
        const account = selectors.wallets.selectAccountById(state, {
          accountId: 'unknown',
          walletId: storedHardwareWallet.walletId,
        });
        expect(account).toBeUndefined();
      });
    });

    describe('selectActiveNetworkAccountCountByWalletId', () => {
      it('returns the count of active network accounts for a given wallet', () => {
        const count =
          selectors.wallets.selectActiveNetworkAccountCountByWalletId(
            state,
            storedHardwareWallet.walletId,
          );
        expect(count).toBe(1);
      });

      it('returns 0 for a wallet with no accounts on the active network', () => {
        const count =
          selectors.wallets.selectActiveNetworkAccountCountByWalletId(
            state,
            'non-existent-wallet',
          );
        expect(count).toBe(0);
      });
    });

    describe('selectWalletById', () => {
      it('returns the wallet with the specified ID', () => {
        const selectedWallet = selectors.wallets.selectWalletById(
          state,
          storedHardwareWallet.walletId,
        );
        expect(selectedWallet).toEqual(storedHardwareWallet);
      });

      it('returns undefined for non-existent wallet ID', () => {
        const selectedWallet = selectors.wallets.selectWalletById(
          state,
          'non-existent-id',
        );
        expect(selectedWallet).toBeUndefined();
      });
    });

    describe('selectActiveAccountContext', () => {
      it('should return the active account context', () => {
        const activeContext =
          selectors.wallets.selectActiveAccountContext(state);
        expect(activeContext).toEqual(state.wallets.activeAccountContext);
      });

      it('should return null if there is no active account context', () => {
        const stateWithNoActiveContext: State = {
          ...state,
          wallets: { ...state.wallets, activeAccountContext: null },
        };
        const activeContext = selectors.wallets.selectActiveAccountContext(
          stateWithNoActiveContext,
        );
        expect(activeContext).toBeNull();
      });
    });
  });
});
