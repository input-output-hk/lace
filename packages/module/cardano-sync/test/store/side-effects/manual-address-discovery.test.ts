import { Cardano } from '@cardano-sdk/core';
import { cardanoContextActions } from '@lace-contract/cardano-context';
import { threeAccountCardanoWalletAccounts } from '@lace-contract/cardano-context/test/mocks';
import { syncActions } from '@lace-contract/sync';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { manualAddressDiscoveryEnqueue } from '../../../src/store/side-effects/manual-address-discovery';

import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { Timestamp } from '@lace-lib/util';

const actions = {
  ...syncActions,
  ...cardanoContextActions,
};

const tip = {
  hash: 'tip-hash',
  blockNo: 1,
  slot: 1,
} as unknown as Cardano.Tip;

describe('manualAddressDiscoveryEnqueue', () => {
  it('enqueues a Pending ADDRESS_DISCOVERY_THOROUGH operation for the active Cardano account', () => {
    testSideEffect(
      manualAddressDiscoveryEnqueue,
      ({ hot, expectObservable }) => {
        const accountId = threeAccountCardanoWalletAccounts[0].accountId;
        const requestManualAddressDiscovery$ = hot('-a', {
          a: actions.cardanoContext.requestManualAddressDiscovery({
            accountId,
          }),
        });
        const selectActiveNetworkAccounts$ = hot<AnyAccount[]>('a', {
          a: threeAccountCardanoWalletAccounts,
        });
        const selectTip$ = hot<Cardano.Tip | undefined>('a', { a: tip });

        return {
          actionObservables: {
            cardanoContext: { requestManualAddressDiscovery$ },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$ },
            cardanoContext: { selectTip$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-${tip.hash}-address-discovery-thorough`,
                  status: 'Pending',
                  description: 'sync.operation.address-discovery',
                  startedAt: expect.any(Number) as unknown as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('falls back to "no-tip" when tip is undefined', () => {
    testSideEffect(
      manualAddressDiscoveryEnqueue,
      ({ hot, expectObservable }) => {
        const accountId = threeAccountCardanoWalletAccounts[0].accountId;
        const requestManualAddressDiscovery$ = hot('-a', {
          a: actions.cardanoContext.requestManualAddressDiscovery({
            accountId,
          }),
        });
        const selectActiveNetworkAccounts$ = hot<AnyAccount[]>('a', {
          a: threeAccountCardanoWalletAccounts,
        });
        const selectTip$ = hot<Cardano.Tip | undefined>('a', { a: undefined });

        return {
          actionObservables: {
            cardanoContext: { requestManualAddressDiscovery$ },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$ },
            cardanoContext: { selectTip$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-no-tip-address-discovery-thorough`,
                  status: 'Pending',
                  description: 'sync.operation.address-discovery',
                  startedAt: expect.any(Number) as unknown as Timestamp,
                },
              }),
            });
          },
        };
      },
    );
  });

  it('emits nothing when the requested account is not Cardano', () => {
    testSideEffect(
      manualAddressDiscoveryEnqueue,
      ({ hot, expectObservable }) => {
        const nonCardanoAccount = {
          ...threeAccountCardanoWalletAccounts[0],
          blockchainName: 'Bitcoin',
        } as unknown as AnyAccount;
        const requestManualAddressDiscovery$ = hot('-a', {
          a: actions.cardanoContext.requestManualAddressDiscovery({
            accountId: nonCardanoAccount.accountId,
          }),
        });
        const selectActiveNetworkAccounts$ = hot<AnyAccount[]>('a', {
          a: [nonCardanoAccount],
        });
        const selectTip$ = hot<Cardano.Tip | undefined>('a', { a: tip });

        return {
          actionObservables: {
            cardanoContext: { requestManualAddressDiscovery$ },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$ },
            cardanoContext: { selectTip$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
          },
        };
      },
    );
  });

  it('emits nothing when the requested account is not in the active set', () => {
    testSideEffect(
      manualAddressDiscoveryEnqueue,
      ({ hot, expectObservable }) => {
        const missingAccountId = AccountId(
          `${WalletId('absent')}-99-${Cardano.ChainIds.Preprod.networkMagic}`,
        );
        const requestManualAddressDiscovery$ = hot('-a', {
          a: actions.cardanoContext.requestManualAddressDiscovery({
            accountId: missingAccountId,
          }),
        });
        const selectActiveNetworkAccounts$ = hot<AnyAccount[]>('a', {
          a: threeAccountCardanoWalletAccounts,
        });
        const selectTip$ = hot<Cardano.Tip | undefined>('a', { a: tip });

        return {
          actionObservables: {
            cardanoContext: { requestManualAddressDiscovery$ },
          },
          stateObservables: {
            wallets: { selectActiveNetworkAccounts$ },
            cardanoContext: { selectTip$ },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
          },
        };
      },
    );
  });
});
