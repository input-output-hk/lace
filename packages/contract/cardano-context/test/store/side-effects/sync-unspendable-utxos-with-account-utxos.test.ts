import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { syncUnspendableUtxosWithAccountUtxos } from '../../../src/store/side-effects/sync-unspendable-utxos-with-account-utxos';
import {
  cardanoContextActions,
  cardanoContextReducers,
  cardanoContextSelectors,
} from '../../../src/store/slice';
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
  it('preserves reserved collateral through reset and refresh, then removes it only when spent', () => {
    const reducer = cardanoContextReducers.cardanoContext;
    const selectors = cardanoContextSelectors.cardanoContext;
    const funded = reducer(
      undefined,
      actions.cardanoContext.setAccountUtxos({
        accountId,
        utxos: [utxo1, utxo2],
      }),
    );
    const reserved = reducer(
      funded,
      actions.cardanoContext.setAccountUnspendableUtxos({
        accountId,
        utxos: [utxo1],
      }),
    );
    const reset = reducer(
      reserved,
      actions.cardanoContext.resetWalletSyncState({ accountId }),
    );
    const refreshed = reducer(
      reset,
      actions.cardanoContext.setAccountUtxos({ accountId, utxos: [utxo1] }),
    );
    const spent = reducer(
      refreshed,
      actions.cardanoContext.setAccountUtxos({ accountId, utxos: [] }),
    );
    expect(
      selectors.selectAccountUnspendableUtxos({ cardanoContext: reset }),
    ).toEqual({ [accountId]: [utxo1] });

    testSideEffect(
      syncUnspendableUtxosWithAccountUtxos,
      ({ cold, expectObservable }) => ({
        stateObservables: {
          cardanoContext: {
            selectAccountUtxos$: cold('a-b-c-d', {
              a: selectors.selectAccountUtxos({ cardanoContext: reserved }),
              b: selectors.selectAccountUtxos({ cardanoContext: reset }),
              c: selectors.selectAccountUtxos({ cardanoContext: refreshed }),
              d: selectors.selectAccountUtxos({ cardanoContext: spent }),
            }),
            selectAccountUnspendableUtxos$: cold('a', {
              a: selectors.selectAccountUnspendableUtxos({
                cardanoContext: reset,
              }),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('------a', {
            a: actions.cardanoContext.setAccountUnspendableUtxos({
              accountId,
              utxos: [],
            }),
          });
        },
      }),
    );
  });

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
