import { viewsActions } from '@lace-contract/views';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { makeNavigateHomeOnCancel } from '../../../src/store/side-effects/navigate-home-on-cancel';

const home = viewsActions.views.setActivePage({ route: 'Home' });
const opened = { type: 'migrateWallet/wizardOpened', payload: {} };
const userCancel = {
  type: 'migrateWallet/wizardCancelled',
  payload: { userInitiated: true },
};
const teardownCancel = { type: 'migrateWallet/wizardCancelled', payload: {} };

const run = ({
  openedMarble,
  cancelMarble,
  cancelValues,
  totalsMarble,
  totals,
  expectedMarble,
}: {
  openedMarble: string;
  cancelMarble: string;
  cancelValues?: Record<string, typeof teardownCancel | typeof userCancel>;
  totalsMarble: string;
  totals: Record<string, number>;
  expectedMarble: string;
}) => {
  // Actions are hot (a re-armed run must not replay past dispatches); state
  // is cold, approximating the emit-current-value-on-subscribe store stream.
  testSideEffect(
    makeNavigateHomeOnCancel(),
    ({ cold, hot, expectObservable }) => ({
      actionObservables: {
        migrateWallet: {
          wizardOpened$: hot(openedMarble, { a: opened }) as never,
          wizardCancelled$: hot(
            cancelMarble,
            cancelValues ?? { c: userCancel },
          ) as never,
        },
      },
      stateObservables: {
        wallets: { selectTotal$: cold(totalsMarble, totals) },
      },
      dependencies: { actions: viewsActions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe(expectedMarble, { a: home });
      },
    }),
  );
};

describe('makeNavigateHomeOnCancel', () => {
  it('lands on Home when a run opened with no wallets is cancelled after creating some', () => {
    // The wallet wait re-subscribes to the (cold) totals at the cancel, so
    // the emission lands when the replay reaches the first non-zero count.
    run({
      openedMarble: 'a---',
      cancelMarble: '---c',
      totalsMarble: 'a-b-',
      totals: { a: 0, b: 2 },
      expectedMarble: '-----a',
    });
  });

  it('still lands on Home when the cancel arrives before the in-flight wallet does', () => {
    // Cancelling during creatingDestination/importingSource tears down
    // tracking, not the creation: the wallet lands AFTER the cancel and the
    // escape must still fire rather than snapshotting the count at cancel.
    run({
      openedMarble: 'a----',
      cancelMarble: '-c---',
      totalsMarble: 'a---b',
      totals: { a: 0, b: 1 },
      expectedMarble: '-----a',
    });
  });

  it('stays put when the run opened with wallets already present', () => {
    run({
      openedMarble: 'a---',
      cancelMarble: '---c',
      totalsMarble: 'a---',
      totals: { a: 2 },
      expectedMarble: '',
    });
  });

  it("ignores exitToWallet's teardown cancel — the finish paths navigate on their own", () => {
    run({
      openedMarble: 'a---',
      cancelMarble: '---c',
      cancelValues: { c: teardownCancel },
      totalsMarble: 'a-b-',
      totals: { a: 0, b: 2 },
      expectedMarble: '',
    });
  });

  it('stays silent when no wallet ever lands after the cancel', () => {
    run({
      openedMarble: 'a---',
      cancelMarble: '---c',
      totalsMarble: 'a---',
      totals: { a: 0 },
      expectedMarble: '',
    });
  });

  it('drops a pending wallet wait when the wizard is re-opened', () => {
    // Re-opening supersedes the stale run (switchMap): a wallet landing after
    // the second open must not trigger the FIRST run's escape.
    run({
      openedMarble: 'a---a--',
      cancelMarble: '-c-----',
      totalsMarble: 'a-----b',
      totals: { a: 0, b: 1 },
      expectedMarble: '',
    });
  });

  it('navigates once, ignoring later wallet-count changes and repeat cancels', () => {
    run({
      openedMarble: 'a------',
      cancelMarble: '---c--d',
      cancelValues: { c: userCancel, d: userCancel },
      totalsMarble: 'a-b--e-',
      totals: { a: 0, b: 2, e: 3 },
      expectedMarble: '-----a-',
    });
  });

  it('emits nothing without a cancel', () => {
    run({
      openedMarble: 'a--',
      cancelMarble: '---',
      totalsMarble: 'a-b',
      totals: { a: 0, b: 2 },
      expectedMarble: '',
    });
  });
});
