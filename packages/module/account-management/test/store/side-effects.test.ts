import { accountManagementActions } from '@lace-contract/account-management';
import { analyticsActions } from '@lace-contract/analytics';
import { BlockchainNetworkId } from '@lace-contract/network';
import {
  AccountId,
  WalletId,
  WalletType,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { HexBytes } from '@lace-sdk/util';
import { describe, it } from 'vitest';

import { sideEffects } from '../../src/store/side-effects';

import type {
  InMemoryWallet,
  HardwareWallet,
} from '@lace-contract/wallet-repo';

const [trackAccountAdded, trackAccountSwitched] = sideEffects;

const actions = {
  ...accountManagementActions,
  ...analyticsActions,
  ...walletsActions,
};

describe('trackAccountAdded', () => {
  it('emits account added analytics event with blockchain and wallet type', () => {
    const payload = {
      walletId: WalletId('wallet-1'),
      blockchain: 'Cardano' as const,
      accountIndex: 1,
      walletType: WalletType.InMemory,
    };

    testSideEffect(trackAccountAdded, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        accountManagement: {
          accountAdded$: cold('a', {
            a: actions.accountManagement.accountAdded(payload),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'account management | account | added',
            payload: {
              blockchain: payload.blockchain,
              walletType: payload.walletType,
              accountIndex: payload.accountIndex,
            },
          }),
        });
      },
    }));
  });

  it('emits analytics event for hardware wallet accounts (carries walletType)', () => {
    const payload = {
      walletId: WalletId('hw-wallet-1'),
      blockchain: 'Cardano' as const,
      accountIndex: 0,
      walletType: WalletType.HardwareLedger,
    };

    testSideEffect(trackAccountAdded, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        accountManagement: {
          accountAdded$: cold('a', {
            a: actions.accountManagement.accountAdded(payload),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'account management | account | added',
            payload: {
              blockchain: payload.blockchain,
              walletType: payload.walletType,
              accountIndex: payload.accountIndex,
            },
          }),
        });
      },
    }));
  });

  it('emits analytics event for midnight blockchain accounts', () => {
    const payload = {
      walletId: WalletId('wallet-2'),
      blockchain: 'Midnight' as const,
      accountIndex: 0,
      walletType: WalletType.InMemory,
    };

    testSideEffect(trackAccountAdded, ({ cold, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {
        accountManagement: {
          accountAdded$: cold('a', {
            a: actions.accountManagement.accountAdded(payload),
          }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('a', {
          a: actions.analytics.trackEvent({
            eventName: 'account management | account | added',
            payload: {
              blockchain: payload.blockchain,
              walletType: payload.walletType,
              accountIndex: payload.accountIndex,
            },
          }),
        });
      },
    }));
  });
});

const walletAId = WalletId('wallet-a');
const walletBId = WalletId('wallet-b');
const cardanoAccountId = AccountId('cardano-1');
const cardanoAccount2Id = AccountId('cardano-2');
const midnightAccountId = AccountId('midnight-1');

const inMemoryWallet: InMemoryWallet = {
  walletId: walletAId,
  type: WalletType.InMemory,
  metadata: { name: 'Wallet A', order: 0 },
  encryptedRecoveryPhrase: HexBytes('0'.repeat(64)),
  isPassphraseConfirmed: true,
  blockchainSpecific: {},
  accounts: [
    {
      accountType: 'InMemory',
      accountId: cardanoAccountId,
      walletId: walletAId,
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
      metadata: { name: 'Cardano 1' },
      blockchainSpecific: {},
    },
    {
      accountType: 'InMemory',
      accountId: cardanoAccount2Id,
      walletId: walletAId,
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
      metadata: { name: 'Cardano 2' },
      blockchainSpecific: {},
    },
  ],
};

const hardwareWallet: HardwareWallet = {
  walletId: walletBId,
  type: WalletType.HardwareLedger,
  metadata: { name: 'Wallet B', order: 1 },
  blockchainSpecific: {},
  accounts: [
    {
      accountType: 'HardwareLedger',
      accountId: midnightAccountId,
      walletId: walletBId,
      blockchainName: 'Midnight',
      networkType: 'testnet',
      blockchainNetworkId: BlockchainNetworkId('midnight-preview'),
      metadata: { name: 'Midnight 1' },
      blockchainSpecific: {},
    },
  ],
};

const allWallets = [inMemoryWallet, hardwareWallet];

describe('trackAccountSwitched', () => {
  it('emits account switched event with from/to categorical fields when accountId changes', () => {
    testSideEffect(trackAccountSwitched, ({ hot, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {},
      stateObservables: {
        wallets: {
          selectActiveAccountContext$: hot('ab', {
            a: { walletId: walletAId, accountId: cardanoAccountId },
            b: { walletId: walletAId, accountId: cardanoAccount2Id },
          }),
          selectAll$: hot('w', { w: allWallets }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-e', {
          e: actions.analytics.trackEvent({
            eventName: 'account | switched',
            payload: {
              fromBlockchain: 'Cardano',
              toBlockchain: 'Cardano',
              fromWalletType: WalletType.InMemory,
              toWalletType: WalletType.InMemory,
              fromNetworkType: 'mainnet',
              toNetworkType: 'mainnet',
              isSameWallet: true,
            },
          }),
        });
      },
    }));
  });

  it('emits with isSameWallet=false and differing blockchain/networkType when crossing wallets', () => {
    testSideEffect(trackAccountSwitched, ({ hot, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {},
      stateObservables: {
        wallets: {
          selectActiveAccountContext$: hot('ab', {
            a: { walletId: walletAId, accountId: cardanoAccountId },
            b: { walletId: walletBId, accountId: midnightAccountId },
          }),
          selectAll$: hot('w', { w: allWallets }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-e', {
          e: actions.analytics.trackEvent({
            eventName: 'account | switched',
            payload: {
              fromBlockchain: 'Cardano',
              toBlockchain: 'Midnight',
              fromWalletType: WalletType.InMemory,
              toWalletType: WalletType.HardwareLedger,
              fromNetworkType: 'mainnet',
              toNetworkType: 'testnet',
              isSameWallet: false,
            },
          }),
        });
      },
    }));
  });

  it('does not emit on initial assignment (null → set)', () => {
    testSideEffect(trackAccountSwitched, ({ hot, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {},
      stateObservables: {
        wallets: {
          selectActiveAccountContext$: hot('ab', {
            a: null,
            b: { walletId: walletAId, accountId: cardanoAccountId },
          }),
          selectAll$: hot('w', { w: allWallets }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('--');
      },
    }));
  });

  it('does not emit on teardown (set → null)', () => {
    testSideEffect(trackAccountSwitched, ({ hot, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {},
      stateObservables: {
        wallets: {
          selectActiveAccountContext$: hot('ab', {
            a: { walletId: walletAId, accountId: cardanoAccountId },
            b: null,
          }),
          selectAll$: hot('w', { w: allWallets }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('--');
      },
    }));
  });

  it('does not emit when accountId is unchanged across emissions', () => {
    const sameContext = { walletId: walletAId, accountId: cardanoAccountId };
    testSideEffect(trackAccountSwitched, ({ hot, expectObservable }) => ({
      dependencies: { actions },
      actionObservables: {},
      stateObservables: {
        wallets: {
          selectActiveAccountContext$: hot('ab', {
            a: sameContext,
            b: sameContext,
          }),
          selectAll$: hot('w', { w: allWallets }),
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('--');
      },
    }));
  });
});
