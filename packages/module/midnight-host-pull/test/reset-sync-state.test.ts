import {
  midnightContextActions,
  MidnightAccountId,
  MidnightNetworkId,
} from '@lace-contract/midnight-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { throwError } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import { resetSyncState } from '../src/store/side-effects/reset-sync-state';

import { NETWORK_ID } from './fixtures';

import type { ActionCreators } from '../src';
import type { MidnightAccountRef } from '../src/lace-client';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type {
  LaceResult,
  MidnightResetSyncStateResult,
} from '@lace-lib/extension-shell-api';

// Passthrough action creators (the watch.test.ts convention): the reset
// dispatches into OTHER contracts' slices, so the test asserts the shapes and
// their ORDER without pulling the RTK slices in.
const tag = (type: string) => (payload?: unknown) => ({ type, payload });
const actions = {
  addresses: { resetAddresses: tag('addresses/resetAddresses') },
  tokens: { resetAccountTokens: tag('tokens/resetAccountTokens') },
  activities: { resetActivities: tag('activities/resetActivities') },
  midnightContext: {
    resetAccountDust: tag('midnightContext/resetAccountDust'),
  },
  sync: { resetAccountSyncStatus: tag('sync/resetAccountSyncStatus') },
  app: { reloadApplication: tag('app/reloadApplication') },
} as unknown as Partial<ActionCreators>;

const WALLET_ID = WalletId('w1');
const accountId = MidnightAccountId(WALLET_ID, 0, NETWORK_ID);
const otherAccountId = MidnightAccountId(WalletId('w2'), 0, NETWORK_ID);

/** The UI intent the row dispatches (the contract-owned action, ADR 14). */
const requestReset = (id: typeof accountId) =>
  midnightContextActions.midnightContext.resetSyncState({ accountId: id });

const midnightAccount = {
  accountId,
  walletId: WALLET_ID,
  accountType: 'InMemory',
  blockchainName: 'Midnight',
  networkType: 'testnet',
  blockchainNetworkId: MidnightNetworkId(NETWORK_ID),
  metadata: { name: 'Midnight #0' },
  blockchainSpecific: { accountIndex: 0, networkId: NETWORK_ID },
} as unknown as AnyAccount;

const cleared: LaceResult<MidnightResetSyncStateResult> = {
  ok: true,
  value: { cleared: true },
};

// `lace.request` never rejects — a host-side failure arrives as a typed result.
const refused: LaceResult<MidnightResetSyncStateResult> = {
  ok: false,
  error: { code: 'internal', message: 'method failed' },
};

const stateObservables = (cold: (marble: string, values?: never) => unknown) =>
  ({
    wallets: {
      selectActiveNetworkAccounts$: cold('a', {
        a: [midnightAccount],
      } as never),
      selectIsWalletRepoMigrating$: cold('a', { a: false } as never),
    },
    midnightContext: {
      selectMidnightBlockchainNetworkId$: cold('a', {
        a: MidnightNetworkId(NETWORK_ID),
      } as never),
    },
  } as never);

/** The six dispatches, in the order the reset must emit them — reload LAST. */
const expectedResets = {
  a: actions.addresses!.resetAddresses({ accountId }),
  b: actions.tokens!.resetAccountTokens({ accountId }),
  c: actions.activities!.resetActivities({ accountId }),
  d: actions.midnightContext!.resetAccountDust({ accountId }),
  e: actions.sync!.resetAccountSyncStatus({ accountId }),
  f: actions.app!.reloadApplication(),
};

describe('midnight-host-pull resetSyncState side effect', () => {
  it('asks the host to clear the checkpoint, then resets the caches and reloads LAST', () => {
    const calls: MidnightAccountRef[] = [];
    testSideEffect(resetSyncState, ({ cold, expectObservable }) => ({
      actionObservables: {
        midnightContext: {
          resetSyncState$: cold('--a', { a: requestReset(accountId) }),
        },
      },
      stateObservables: stateObservables(cold),
      dependencies: {
        actions,
        logger: dummyLogger,
        canResetMidnightSyncState: true,
        resetMidnightSyncState: (ref: MidnightAccountRef) => {
          calls.push(ref);
          return cold('(a|)', { a: cleared });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('--(abcdef)', expectedResets);
      },
    }));
    // The host call names the account the ADR-48 way (walletId + index +
    // SDK network), never the guest's composite accountId.
    expect(calls).toEqual([
      { walletId: WALLET_ID, accountIndex: 0, network: NETWORK_ID },
    ]);
  });

  it('no-ops silently against an older host lacking the capability', () => {
    const calls: MidnightAccountRef[] = [];
    testSideEffect(resetSyncState, ({ cold, expectObservable }) => ({
      actionObservables: {
        midnightContext: {
          resetSyncState$: cold('--a', { a: requestReset(accountId) }),
        },
      },
      stateObservables: stateObservables(cold),
      dependencies: {
        actions,
        logger: dummyLogger,
        canResetMidnightSyncState: false,
        resetMidnightSyncState: (ref: MidnightAccountRef) => {
          calls.push(ref);
          return cold('(a|)', { a: cleared });
        },
      },
      // Disabled: returns EMPTY (completes at frame 0) — no wipe, no reload.
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('|');
      },
    }));
    expect(calls).toEqual([]);
  });

  it('ignores a reset for an account it does not know', () => {
    const calls: MidnightAccountRef[] = [];
    testSideEffect(resetSyncState, ({ cold, expectObservable }) => ({
      actionObservables: {
        midnightContext: {
          resetSyncState$: cold('--a', {
            a: requestReset(otherAccountId),
          }),
        },
      },
      stateObservables: stateObservables(cold),
      dependencies: {
        actions,
        logger: dummyLogger,
        canResetMidnightSyncState: true,
        resetMidnightSyncState: (ref: MidnightAccountRef) => {
          calls.push(ref);
          return cold('(a|)', { a: cleared });
        },
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('');
      },
    }));
    expect(calls).toEqual([]);
  });

  it('still resets and reloads when the host call THROWS', () => {
    testSideEffect(resetSyncState, ({ cold, expectObservable }) => ({
      actionObservables: {
        midnightContext: {
          resetSyncState$: cold('--a', { a: requestReset(accountId) }),
        },
      },
      stateObservables: stateObservables(cold),
      dependencies: {
        actions,
        logger: dummyLogger,
        canResetMidnightSyncState: true,
        resetMidnightSyncState: () => throwError(() => new Error('wire down')),
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('--(abcdef)', expectedResets);
      },
    }));
  });

  it('still resets and reloads when the host REFUSES (the wire never rejects)', () => {
    testSideEffect(resetSyncState, ({ cold, expectObservable }) => ({
      actionObservables: {
        midnightContext: {
          resetSyncState$: cold('--a', { a: requestReset(accountId) }),
        },
      },
      stateObservables: stateObservables(cold),
      dependencies: {
        actions,
        logger: dummyLogger,
        canResetMidnightSyncState: true,
        resetMidnightSyncState: () => cold('(a|)', { a: refused }),
      },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('--(abcdef)', expectedResets);
      },
    }));
  });

  it('supersedes a hung host call when the reset is pressed again', () => {
    const calls: MidnightAccountRef[] = [];
    testSideEffect(resetSyncState, ({ cold, expectObservable }) => ({
      actionObservables: {
        midnightContext: {
          // Two presses; the first host call never answers.
          resetSyncState$: cold('--a 4ms b', {
            a: requestReset(accountId),
            b: requestReset(accountId),
          }),
        },
      },
      stateObservables: stateObservables(cold),
      dependencies: {
        actions,
        logger: dummyLogger,
        canResetMidnightSyncState: true,
        resetMidnightSyncState: (ref: MidnightAccountRef) => {
          calls.push(ref);
          return calls.length === 1 ? cold('') : cold('(a|)', { a: cleared });
        },
      },
      // Only the second press completes — the hung first one is unsubscribed,
      // so a wedged account is never stuck behind it for the session.
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-------(abcdef)', expectedResets);
      },
    }));
    expect(calls).toHaveLength(2);
  });
});
