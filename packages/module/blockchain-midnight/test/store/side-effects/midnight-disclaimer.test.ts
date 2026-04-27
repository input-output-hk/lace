import { midnightContextActions } from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { BlockchainNetworkId } from '@lace-contract/network';
import {
  walletsActions,
  AccountId,
  WalletId,
  WalletType,
} from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { HexBytes } from '@lace-sdk/util';
import { describe, it } from 'vitest';

import { triggerMidnightDisclaimerOnWalletCreation } from '../../../src/store/side-effects';

import type {
  HardwareWallet,
  InMemoryWallet,
} from '@lace-contract/wallet-repo';
import type { Action } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

const actions = { ...walletsActions, ...midnightContextActions };

const testWalletId = WalletId('test-disclaimer-wallet');

const cardanoAccount = {
  accountType: 'InMemory' as const,
  accountId: AccountId('ada-1'),
  walletId: testWalletId,
  blockchainName: 'Cardano' as const,
  networkType: 'testnet' as const,
  blockchainNetworkId: BlockchainNetworkId('cardano-1'),
  metadata: { name: 'ADA' },
  blockchainSpecific: {},
};

const secondCardanoAccount = {
  ...cardanoAccount,
  accountId: AccountId('ada-2'),
  metadata: { name: 'ADA 2' },
};

const midnightAccount = {
  accountType: 'InMemory' as const,
  accountId: AccountId('mn-1'),
  walletId: testWalletId,
  blockchainName: 'Midnight' as const,
  networkType: 'testnet' as const,
  blockchainNetworkId: BlockchainNetworkId('midnight-preview'),
  metadata: { name: 'MN' },
  blockchainSpecific: {},
};

const cardanoOnlyWallet: InMemoryWallet = {
  walletId: testWalletId,
  type: WalletType.InMemory,
  metadata: { name: 'Test', order: 0 },
  encryptedRecoveryPhrase: HexBytes('0'.repeat(64)),
  isPassphraseConfirmed: true,
  blockchainSpecific: {},
  accounts: [cardanoAccount],
};

const cardanoAndMidnightWallet: InMemoryWallet = {
  ...cardanoOnlyWallet,
  accounts: [cardanoAccount, midnightAccount],
};

const cardanoMidnightAndAnotherCardanoWallet: InMemoryWallet = {
  ...cardanoOnlyWallet,
  accounts: [cardanoAccount, midnightAccount, secondCardanoAccount],
};

const hardwareCardanoOnlyWallet: HardwareWallet = {
  accounts: [
    {
      accountType: 'HardwareLedger',
      accountId: AccountId('hw-1'),
      walletId: WalletId('hw-wallet'),
      blockchainName: 'Cardano',
      networkType: 'testnet',
      blockchainNetworkId: BlockchainNetworkId('cardano-1'),
      metadata: { name: 'HW' },
      blockchainSpecific: {},
    },
  ],
  blockchainSpecific: {},
  metadata: { name: 'HW wallet', order: 0 },
  type: WalletType.HardwareLedger,
  walletId: WalletId('hw-wallet'),
};

describe('triggerMidnightDisclaimerOnWalletCreation', () => {
  it('dispatches set shown when addWallet includes an in-memory Midnight account and disclaimer is not-shown', () => {
    testSideEffect(
      triggerMidnightDisclaimerOnWalletCreation,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          wallets: {
            addWallet$: cold('--a', {
              a: actions.wallets.addWallet(stubData.midnightWallet),
            }),
            updateWallet$: cold('------'),
          },
        },
        stateObservables: {
          midnightContext: {
            selectShouldAcknowledgeMidnightDisclaimer$: cold('n--', {
              n: 'not-shown' as const,
            }),
          },
          wallets: {
            selectAll$: cold('0--', { 0: [] }),
          },
        },
        dependencies: { actions },
        assertion: (sideEffect$: Observable<Action>) => {
          expectObservable(sideEffect$).toBe('--b', {
            b: actions.midnightContext.setShouldAcknowledgeMidnightDisclaimer(
              'shown',
            ),
          });
        },
      }),
    );
  });

  it('does not dispatch when addWallet has no in-memory Midnight account', () => {
    testSideEffect(
      triggerMidnightDisclaimerOnWalletCreation,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          wallets: {
            addWallet$: cold('--a', {
              a: actions.wallets.addWallet(hardwareCardanoOnlyWallet),
            }),
            updateWallet$: cold('------'),
          },
        },
        stateObservables: {
          midnightContext: {
            selectShouldAcknowledgeMidnightDisclaimer$: cold('n--', {
              n: 'not-shown' as const,
            }),
          },
          wallets: {
            selectAll$: cold('0--', { 0: [] }),
          },
        },
        dependencies: { actions },
        assertion: (sideEffect$: Observable<Action>) => {
          expectObservable(sideEffect$).toBe('------');
        },
      }),
    );
  });

  it('does not dispatch addWallet when disclaimer is already acknowledged', () => {
    testSideEffect(
      triggerMidnightDisclaimerOnWalletCreation,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          wallets: {
            addWallet$: cold('--a', {
              a: actions.wallets.addWallet(stubData.midnightWallet),
            }),
            updateWallet$: cold('------'),
          },
        },
        stateObservables: {
          midnightContext: {
            selectShouldAcknowledgeMidnightDisclaimer$: cold('k--', {
              k: 'acknowledged' as const,
            }),
          },
          wallets: {
            selectAll$: cold('0--', { 0: [] }),
          },
        },
        dependencies: { actions },
        assertion: (sideEffect$: Observable<Action>) => {
          expectObservable(sideEffect$).toBe('------');
        },
      }),
    );
  });

  it('dispatches set shown when updateWallet adds a new Midnight account (pairwise state) and disclaimer is not-shown', () => {
    testSideEffect(
      triggerMidnightDisclaimerOnWalletCreation,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          wallets: {
            addWallet$: cold('---------'),
            updateWallet$: cold('--u', {
              u: actions.wallets.updateWallet({
                id: testWalletId,
                changes: { accounts: cardanoAndMidnightWallet.accounts },
              }),
            }),
          },
        },
        stateObservables: {
          midnightContext: {
            selectShouldAcknowledgeMidnightDisclaimer$: cold('n---', {
              n: 'not-shown' as const,
            }),
          },
          wallets: {
            selectAll$: cold('ab-', {
              a: [cardanoOnlyWallet],
              b: [cardanoAndMidnightWallet],
            }),
          },
        },
        dependencies: { actions },
        assertion: (sideEffect$: Observable<Action>) => {
          expectObservable(sideEffect$).toBe('--c', {
            c: actions.midnightContext.setShouldAcknowledgeMidnightDisclaimer(
              'shown',
            ),
          });
        },
      }),
    );
  });

  it('does not dispatch updateWallet when accounts change but existing Midnight ids are unchanged', () => {
    testSideEffect(
      triggerMidnightDisclaimerOnWalletCreation,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          wallets: {
            addWallet$: cold('---------'),
            updateWallet$: cold('--u', {
              u: actions.wallets.updateWallet({
                id: testWalletId,
                changes: {
                  accounts: cardanoMidnightAndAnotherCardanoWallet.accounts,
                },
              }),
            }),
          },
        },
        stateObservables: {
          midnightContext: {
            selectShouldAcknowledgeMidnightDisclaimer$: cold('n---', {
              n: 'not-shown' as const,
            }),
          },
          wallets: {
            selectAll$: cold('ab-', {
              a: [cardanoAndMidnightWallet],
              b: [cardanoMidnightAndAnotherCardanoWallet],
            }),
          },
        },
        dependencies: { actions },
        assertion: (sideEffect$: Observable<Action>) => {
          expectObservable(sideEffect$).toBe('---');
        },
      }),
    );
  });

  it('does not dispatch updateWallet when changes omit accounts', () => {
    testSideEffect(
      triggerMidnightDisclaimerOnWalletCreation,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          wallets: {
            addWallet$: cold('---------'),
            updateWallet$: cold('--u', {
              u: actions.wallets.updateWallet({
                id: testWalletId,
                changes: { metadata: { name: 'Renamed wallet', order: 0 } },
              }),
            }),
          },
        },
        stateObservables: {
          midnightContext: {
            selectShouldAcknowledgeMidnightDisclaimer$: cold('n---', {
              n: 'not-shown' as const,
            }),
          },
          wallets: {
            selectAll$: cold('ab-', {
              a: [cardanoOnlyWallet],
              b: [
                {
                  ...cardanoOnlyWallet,
                  metadata: { name: 'Renamed wallet', order: 0 },
                },
              ],
            }),
          },
        },
        dependencies: { actions },
        assertion: (sideEffect$: Observable<Action>) => {
          expectObservable(sideEffect$).toBe('---');
        },
      }),
    );
  });

  it('does not dispatch updateWallet when disclaimer is already shown', () => {
    testSideEffect(
      triggerMidnightDisclaimerOnWalletCreation,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          wallets: {
            addWallet$: cold('---------'),
            updateWallet$: cold('--u', {
              u: actions.wallets.updateWallet({
                id: testWalletId,
                changes: { accounts: cardanoAndMidnightWallet.accounts },
              }),
            }),
          },
        },
        stateObservables: {
          midnightContext: {
            selectShouldAcknowledgeMidnightDisclaimer$: cold('s---', {
              s: 'shown' as const,
            }),
          },
          wallets: {
            selectAll$: cold('ab-', {
              a: [cardanoOnlyWallet],
              b: [cardanoAndMidnightWallet],
            }),
          },
        },
        dependencies: { actions },
        assertion: (sideEffect$: Observable<Action>) => {
          expectObservable(sideEffect$).toBe('---');
        },
      }),
    );
  });
});
