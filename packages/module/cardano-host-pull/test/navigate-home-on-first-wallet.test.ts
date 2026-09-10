import { viewsActions } from '@lace-contract/views';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { navigateHomeOnFirstWallet } from '../src/store/side-effects/navigate-home-on-first-wallet';

const home = viewsActions.views.setActivePage({ route: 'Home' });

const run = ({
  totalsMarble,
  totals,
  activePage,
  expectedMarble,
}: {
  totalsMarble: string;
  totals: Record<string, number>;
  activePage: { route: string } | null;
  expectedMarble: string;
}) => {
  testSideEffect(navigateHomeOnFirstWallet, ({ cold, expectObservable }) => ({
    actionObservables: {},
    stateObservables: {
      wallets: { selectTotal$: cold(totalsMarble, totals) },
      views: { getActivePage$: cold('a', { a: activePage }) },
    },
    dependencies: { actions: viewsActions },
    assertion: sideEffect$ => {
      expectObservable(sideEffect$).toBe(expectedMarble, { a: home });
    },
  }));
};

describe('navigateHomeOnFirstWallet', () => {
  it('navigates home when the first wallet projects and no page was set', () => {
    run({
      totalsMarble: 'a-b',
      totals: { a: 0, b: 1 },
      activePage: null,
      expectedMarble: '--a',
    });
  });

  it('navigates home when the first wallet projects while on onboarding', () => {
    run({
      totalsMarble: 'a-b',
      totals: { a: 0, b: 1 },
      activePage: { route: 'OnboardingStart' },
      expectedMarble: '--a',
    });
  });

  it('does not navigate when the user is on a non-onboarding page', () => {
    run({
      totalsMarble: 'a-b',
      totals: { a: 0, b: 1 },
      activePage: { route: 'Settings' },
      expectedMarble: '',
    });
  });

  it('does not navigate when wallets were already present at boot', () => {
    run({
      totalsMarble: 'a-b',
      totals: { a: 2, b: 3 },
      activePage: null,
      expectedMarble: '',
    });
  });

  it('does not re-navigate when further wallets are added', () => {
    run({
      totalsMarble: 'a-b-c',
      totals: { a: 0, b: 1, c: 2 },
      activePage: null,
      expectedMarble: '--a',
    });
  });

  it('navigates again when the repo empties and a first wallet lands anew', () => {
    run({
      totalsMarble: 'a-b-c-d',
      totals: { a: 0, b: 1, c: 0, d: 1 },
      activePage: null,
      expectedMarble: '--a---a',
    });
  });
});
