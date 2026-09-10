import { vaultActions } from '@lace-contract/vault';
import { viewsActions } from '@lace-contract/views';
import { WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { describe, it } from 'vitest';

import { showWalletAddedSheet } from '../src/store/side-effects/show-wallet-added-sheet';

const settled = vaultActions.vault.ceremonySettled({
  ceremony: 'connect-hardware',
  mounted: true,
});

const failedMount = vaultActions.vault.ceremonySettled({
  ceremony: 'connect-hardware',
  mounted: false,
});

const successSheet = (walletId: string) =>
  viewsActions.views.setActiveSheetPage({
    route: 'SuccessCreateNewWallet',
    params: { walletId: WalletId(walletId) },
  });

const run = ({
  settledMarble,
  idsMarble,
  ids,
  expectedMarble,
  expected,
}: {
  settledMarble?: string;
  idsMarble: string;
  ids: Record<string, WalletId[]>;
  expectedMarble: string;
  expected?: Record<string, unknown>;
}) => {
  // HOT for both: each settle re-subscribes the id stream, and a cold marble
  // would replay its whole timeline from that subscription — handing the second
  // ceremony the FIRST wallet again.
  testSideEffect(showWalletAddedSheet, ({ hot, expectObservable }) => ({
    actionObservables: {
      vault: {
        ceremonySettled$: settledMarble
          ? hot(settledMarble, { s: settled, f: failedMount })
          : NEVER,
      },
    },
    stateObservables: { wallets: { selectIds$: hot(idsMarble, ids) } },
    dependencies: { actions: viewsActions },
    assertion: sideEffect$ => {
      expectObservable(sideEffect$).toBe(expectedMarble, expected);
    },
  }));
};

const w1 = WalletId('w1');
const w2 = WalletId('w2');
const w3 = WalletId('w3');

describe('showWalletAddedSheet', () => {
  it('surfaces the success sheet for the wallet that landed', () => {
    run({
      settledMarble: '-s',
      idsMarble: '--a-b',
      ids: { a: [w1], b: [w1, w2] },
      expectedMarble: '----a',
      expected: { a: successSheet('w2') },
    });
  });

  it('names the landed wallet even when it sorts ahead of the existing one', () => {
    run({
      settledMarble: '-s',
      idsMarble: '--a-b',
      ids: { a: [w2], b: [w1, w2] },
      expectedMarble: '----a',
      expected: { a: successSheet('w1') },
    });
  });

  it('stays out of the way of the FIRST wallet, which onboarding navigates home', () => {
    run({
      settledMarble: '-s',
      idsMarble: '--a-b',
      ids: { a: [], b: [w1] },
      expectedMarble: '',
    });
  });

  it('does not fire when a wallet is removed', () => {
    run({
      settledMarble: '-s',
      idsMarble: '--a-b',
      ids: { a: [w1, w2], b: [w1] },
      expectedMarble: '',
    });
  });

  it('does not fire when the repo re-emits an unchanged wallet set', () => {
    run({
      settledMarble: '-s',
      idsMarble: '--a-b',
      ids: { a: [w1], b: [w1] },
      expectedMarble: '',
    });
  });

  // A projection that only reconciles what another view already did is not this
  // user's doing — congratulating them for it would be a lie.
  it('does not fire for a wallet that lands with no ceremony of this view outstanding', () => {
    run({
      idsMarble: '--a-b',
      ids: { a: [w1], b: [w1, w2] },
      expectedMarble: '',
    });
  });

  it('fires once per ceremony, not once per wallet the repo goes on to gain', () => {
    run({
      settledMarble: '-s',
      idsMarble: '--a-b-c',
      ids: { a: [w1], b: [w1, w2], c: [w1, w2, w3] },
      expectedMarble: '----a',
      expected: { a: successSheet('w2') },
    });
  });

  it('leaves an armed watch alone when a later ceremony fails to mount', () => {
    run({
      settledMarble: '-s-f',
      idsMarble: '--a---b',
      ids: { a: [w1], b: [w1, w2] },
      expectedMarble: '------a',
      expected: { a: successSheet('w2') },
    });
  });

  it('re-arms for the next ceremony', () => {
    run({
      settledMarble: '-s----s',
      idsMarble: '--a-b---c-d',
      ids: { a: [w1], b: [w1, w2], c: [w1, w2], d: [w1, w2, w3] },
      expectedMarble: '----a-----b',
      expected: { a: successSheet('w2'), b: successSheet('w3') },
    });
  });
});
