import { syncActions } from '@lace-contract/sync';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { clearStaleCardanoSyncsOnResume } from '../../../src/store/side-effects/clear-stale-cardano-syncs-on-resume';
import {
  midnightAccount,
  previewAccountCardanoWalletAccounts,
} from '../../mocks';

import type { AnyAccount } from '@lace-contract/wallet-repo';

const actions = { ...syncActions };

const cardanoAccount = previewAccountCardanoWalletAccounts[0];

describe('clearStaleCardanoSyncsOnResume', () => {
  it('dispatches clearPendingSyncsForAccounts with only Cardano account ids on each walletResumed$ emission', () => {
    testSideEffect(
      clearStaleCardanoSyncsOnResume,
      ({ hot, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectActiveNetworkAccounts$: hot<AnyAccount[]>('a', {
              a: [cardanoAccount, midnightAccount],
            }),
          },
        },
        dependencies: {
          actions,
          walletResumed$: hot('----u', { u: undefined }),
        },
        assertion: sideEffect$ => {
          // Midnight account is filtered out — it has stable per-account
          // sync IDs that are updated in place by the next emission.
          expectObservable(sideEffect$).toBe('----a', {
            a: actions.sync.clearPendingSyncsForAccounts({
              accountIds: [cardanoAccount.accountId],
            }),
          });
        },
      }),
    );
  });

  it('does not dispatch when walletResumed$ never emits, even if isWalletActive$ rises (e.g. Preparing→AwaitingSetup boot path with PAUSE_NETWORK_POLLING_WHILE_LOCKED)', () => {
    testSideEffect(
      clearStaleCardanoSyncsOnResume,
      ({ hot, cold, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectActiveNetworkAccounts$: hot<AnyAccount[]>('a', {
              a: [cardanoAccount],
            }),
          },
        },
        dependencies: {
          actions,
          // Simulates the Preparing(false) → AwaitingSetup(true) boot
          // transition when PAUSE_NETWORK_POLLING_WHILE_LOCKED is on —
          // a false→true rising edge on `isWalletActive$` without a
          // pause to resume from.
          isWalletActive$: hot('f---t', { f: false, t: true }),
          walletResumed$: cold('-'),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      }),
    );
  });

  it('dispatches an empty list when no Cardano accounts are active', () => {
    // Midnight-only setup: the dispatch still fires (resume happened)
    // but the payload is empty, so the reducer is a no-op.
    testSideEffect(
      clearStaleCardanoSyncsOnResume,
      ({ hot, expectObservable }) => ({
        stateObservables: {
          wallets: {
            selectActiveNetworkAccounts$: hot<AnyAccount[]>('a', {
              a: [midnightAccount],
            }),
          },
        },
        dependencies: {
          actions,
          walletResumed$: hot('----u', { u: undefined }),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('----a', {
            a: actions.sync.clearPendingSyncsForAccounts({ accountIds: [] }),
          });
        },
      }),
    );
  });
});
