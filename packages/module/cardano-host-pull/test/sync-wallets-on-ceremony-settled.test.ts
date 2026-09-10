import { vaultActions } from '@lace-contract/vault';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { describe, it } from 'vitest';

import { syncWalletsOnCeremonySettled } from '../src/store/side-effects/sync-wallets-on-ceremony-settled';
import { cardanoHostPullActions } from '../src/store/slice';

import type { Ceremony } from '@lace-contract/vault';

const settled = (ceremony: Ceremony, mounted = true) =>
  vaultActions.vault.ceremonySettled({ ceremony, mounted });

const syncRequested =
  cardanoHostPullActions.cardanoHostPull.syncWalletsRequested();

const run = ({
  settledMarble,
  settles = { s: settled('create') },
  expectedMarble,
}: {
  settledMarble?: string;
  settles?: Record<string, ReturnType<typeof settled>>;
  expectedMarble: string;
}) => {
  testSideEffect(
    syncWalletsOnCeremonySettled,
    ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          ceremonySettled$: settledMarble
            ? cold(settledMarble, settles)
            : NEVER,
        },
      },
      dependencies: { actions: cardanoHostPullActions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe(expectedMarble, {
          a: syncRequested,
        });
      },
    }),
  );
};

describe('syncWalletsOnCeremonySettled', () => {
  it('requests a wallet-repo sync when a ceremony settles', () => {
    run({ settledMarble: '-s', expectedMarble: '-a' });
  });

  it('requests a sync for every ceremony that settles', () => {
    run({ settledMarble: '-s-s--s', expectedMarble: '-a-a--a' });
  });

  it('requests a sync for ceremonies that remove or rename rather than add', () => {
    run({
      settledMarble: '-r-n',
      settles: { r: settled('remove-wallet'), n: settled('rename') },
      expectedMarble: '-a-a',
    });
  });

  it('requests nothing while no ceremony settles', () => {
    run({ expectedMarble: '' });
  });

  it('requests no sync when the ceremony surface never mounted', () => {
    run({
      settledMarble: '-f',
      settles: { f: settled('create', false) },
      expectedMarble: '',
    });
  });

  it('still syncs the mounted ceremonies around a failed mount', () => {
    run({
      settledMarble: '-f-s',
      settles: { f: settled('add-account', false), s: settled('add-account') },
      expectedMarble: '---a',
    });
  });
});
