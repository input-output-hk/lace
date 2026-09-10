import { Cardano } from '@cardano-sdk/core';
import { syncActions } from '@lace-contract/sync';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { clearStaleCardanoSyncsOnNetworkChange } from '../../../src/store/side-effects/clear-stale-cardano-syncs-on-network-change';
import {
  midnightWallet,
  previewAccountCardanoWalletAccounts,
  threeAccountCardanoWallet,
  threeAccountCardanoWalletAccounts,
} from '../../mocks';

import type { CardanoBip32AccountProps } from '../../../src';
import type { AnyWallet, HardwareWallet } from '@lace-contract/wallet-repo';

const actions = { ...syncActions };

// One wallet carrying Cardano accounts on both networks (ADR 11: accounts are
// network-specific), so a network switch leaves the other network's accounts
// present-but-inactive — exactly the accounts whose orphaned round must be cleared.
const cardanoWalletBothNetworks: HardwareWallet<CardanoBip32AccountProps> = {
  ...threeAccountCardanoWallet,
  accounts: [
    ...threeAccountCardanoWalletAccounts, // Preprod (networkMagic 1)
    ...previewAccountCardanoWalletAccounts, // Preview (networkMagic 2)
  ],
};

const preprodAccountIds = threeAccountCardanoWalletAccounts.map(
  account => account.accountId,
);

const wallets: AnyWallet[] = [cardanoWalletBothNetworks, midnightWallet];

describe('clearStaleCardanoSyncsOnNetworkChange', () => {
  it('clears pendingSync for the now-inactive network Cardano accounts on an active-chain change', () => {
    testSideEffect(
      clearStaleCardanoSyncsOnNetworkChange,
      ({ hot, expectObservable }) => ({
        stateObservables: {
          wallets: { selectAll$: hot<AnyWallet[]>('a', { a: wallets }) },
          cardanoContext: {
            selectChainId$: hot<Cardano.ChainId>('ab', {
              a: Cardano.ChainIds.Preprod,
              b: Cardano.ChainIds.Preview,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          // Switching to Preview clears the Preprod accounts (inactive now);
          // the active Preview account and the Midnight account are excluded.
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.sync.clearPendingSyncsForAccounts({
              accountIds: preprodAccountIds,
            }),
          });
        },
      }),
    );
  });

  it('does not clear on the initial boot chain (only reacts to changes)', () => {
    testSideEffect(
      clearStaleCardanoSyncsOnNetworkChange,
      ({ hot, expectObservable }) => ({
        stateObservables: {
          wallets: { selectAll$: hot<AnyWallet[]>('a', { a: wallets }) },
          cardanoContext: {
            selectChainId$: hot<Cardano.ChainId>('a', {
              a: Cardano.ChainIds.Preprod,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      }),
    );
  });

  it('does not dispatch when the switch orphans no account', () => {
    testSideEffect(
      clearStaleCardanoSyncsOnNetworkChange,
      ({ hot, expectObservable }) => ({
        stateObservables: {
          wallets: {
            // Preview only: switching TO Preview leaves nothing on another chain.
            selectAll$: hot<AnyWallet[]>('a', {
              a: [
                {
                  ...threeAccountCardanoWallet,
                  accounts: previewAccountCardanoWalletAccounts,
                },
                midnightWallet,
              ],
            }),
          },
          cardanoContext: {
            selectChainId$: hot<Cardano.ChainId>('ab', {
              a: Cardano.ChainIds.Preprod,
              b: Cardano.ChainIds.Preview,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('--');
        },
      }),
    );
  });

  it('ignores a same-network-magic re-emission (distinctUntilChanged)', () => {
    testSideEffect(
      clearStaleCardanoSyncsOnNetworkChange,
      ({ hot, expectObservable }) => ({
        stateObservables: {
          wallets: { selectAll$: hot<AnyWallet[]>('a', { a: wallets }) },
          cardanoContext: {
            selectChainId$: hot<Cardano.ChainId>('abc', {
              a: Cardano.ChainIds.Preprod,
              b: Cardano.ChainIds.Preview,
              // Distinct object ref, same networkMagic as the previous Preview —
              // must not fire a second clear.
              c: { ...Cardano.ChainIds.Preview },
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.sync.clearPendingSyncsForAccounts({
              accountIds: preprodAccountIds,
            }),
          });
        },
      }),
    );
  });
});
