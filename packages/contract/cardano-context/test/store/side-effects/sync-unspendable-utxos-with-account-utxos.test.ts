import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import { syncUnspendableUtxosWithAccountUtxos } from '../../../src/store/side-effects/sync-unspendable-utxos-with-account-utxos';
import { utxo1, utxo2 } from '../../mocks';

import type {
  AccountUtxoMap,
  AccountUnspendableUtxoMap,
} from '../../../src/types';

const actions = {
  ...cardanoContextActions,
};

const accountId = AccountId('test-account-1');

describe('syncUnspendableUtxosWithAccountUtxos', () => {
  it('dispatches setAccountUnspendableUtxos when some unspendable UTXOs are no longer in accountUtxos', () => {
    testSideEffect(
      syncUnspendableUtxosWithAccountUtxos,
      ({ cold, expectObservable }) => {
        const selectAccountUtxos$ = cold<AccountUtxoMap>('a', {
          a: { [accountId]: [utxo1] },
        });
        const selectAccountUnspendableUtxos$ = cold<AccountUnspendableUtxoMap>(
          'a',
          {
            a: { [accountId]: [utxo1, utxo2] },
          },
        );

        return {
          stateObservables: {
            cardanoContext: {
              selectAccountUtxos$,
              selectAccountUnspendableUtxos$,
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.setAccountUnspendableUtxos({
                accountId,
                utxos: [utxo1],
              }),
            });
          },
        };
      },
    );
  });

  it('does not dispatch when all unspendable UTXOs are still in accountUtxos', () => {
    testSideEffect(
      syncUnspendableUtxosWithAccountUtxos,
      ({ cold, expectObservable }) => {
        const selectAccountUtxos$ = cold<AccountUtxoMap>('a', {
          a: { [accountId]: [utxo1, utxo2] },
        });
        const selectAccountUnspendableUtxos$ = cold<AccountUnspendableUtxoMap>(
          'a',
          {
            a: { [accountId]: [utxo1, utxo2] },
          },
        );

        return {
          stateObservables: {
            cardanoContext: {
              selectAccountUtxos$,
              selectAccountUnspendableUtxos$,
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
          },
        };
      },
    );
  });

  it('does not dispatch when accountUnspendableUtxos is empty', () => {
    testSideEffect(
      syncUnspendableUtxosWithAccountUtxos,
      ({ cold, expectObservable }) => {
        const selectAccountUtxos$ = cold<AccountUtxoMap>('a', {
          a: { [accountId]: [utxo1] },
        });
        const selectAccountUnspendableUtxos$ = cold<AccountUnspendableUtxoMap>(
          'a',
          {
            a: {},
          },
        );

        return {
          stateObservables: {
            cardanoContext: {
              selectAccountUtxos$,
              selectAccountUnspendableUtxos$,
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
          },
        };
      },
    );
  });

  it('dispatches setAccountUnspendableUtxos with empty array when no unspendable UTXOs remain in accountUtxos', () => {
    testSideEffect(
      syncUnspendableUtxosWithAccountUtxos,
      ({ cold, expectObservable }) => {
        const selectAccountUtxos$ = cold<AccountUtxoMap>('a', {
          a: { [accountId]: [] },
        });
        const selectAccountUnspendableUtxos$ = cold<AccountUnspendableUtxoMap>(
          'a',
          {
            a: { [accountId]: [utxo1, utxo2] },
          },
        );

        return {
          stateObservables: {
            cardanoContext: {
              selectAccountUtxos$,
              selectAccountUnspendableUtxos$,
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('a', {
              a: actions.cardanoContext.setAccountUnspendableUtxos({
                accountId,
                utxos: [],
              }),
            });
          },
        };
      },
    );
  });
});
