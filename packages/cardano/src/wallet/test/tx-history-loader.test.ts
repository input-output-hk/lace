/* eslint-disable no-magic-numbers */
import { Cardano } from '@cardano-sdk/core';
import { GroupedAddress } from '@cardano-sdk/key-management';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { toEmpty } from '@cardano-sdk/util-rxjs';
import { merge, of, tap } from 'rxjs';
import {
  createTxHistoryLoader,
  ObservableTransactionsByAddressesProvider,
  TxHistoryLoaderObservableWallet
} from '../lib/tx-history-loader';

const stubTx = (blockNo: number) => ({ id: blockNo.toString(), blockHeader: { blockNo } } as Cardano.HydratedTx);

describe('TxHistoryLoader', () => {
  const addresses$ = of([
    {
      address:
        'addr_test1qpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5ewvxwdrt70qlcpeeagscasafhffqsxy36t90ldv06wqrk2qum8x5w'
    } as GroupedAddress
  ]);
  const syncStatus: TxHistoryLoaderObservableWallet['syncStatus'] = { isSettled$: of(true) };
  const txs = Array.from({ length: 100 }).map((_, i) => stubTx(100 - i));
  const minimumPageSize = 3;
  let provider: jest.MockedFunction<ObservableTransactionsByAddressesProvider>;

  beforeEach(() => {
    provider = jest.fn();
  });

  describe('with empty transaction history$', () => {
    it.todo('TODO');
  });

  describe('with more than {minimumPageSize} transactions in history$', () => {
    // reenable in LW-12324
    it.skip('emits transactions from history$ first, then fetches from provider; watches the tip', () => {
      createTestScheduler().run(({ hot, flush, expectObservable }) => {
        // two pages + 1 tx is available locally
        const numberOfTransactionsAvailableLocally = minimumPageSize * 2 + 1;
        // txs is desc, history$ emits asc
        const initialHistory = txs.slice(0, numberOfTransactionsAvailableLocally).reverse();
        const newTx = stubTx(101);
        const history$ = hot('a----ad---f', {
          a: initialHistory,
          // found new tx
          d: [...initialHistory, newTx],
          // new tx rolled back
          f: initialHistory
        });
        const wallet: TxHistoryLoaderObservableWallet = { addresses$, syncStatus, transactions: { history$ } };
        const loader = createTxHistoryLoader(provider, wallet, minimumPageSize);
        provider
          // full page
          .mockReturnValueOnce(
            of(txs.slice(numberOfTransactionsAvailableLocally, numberOfTransactionsAvailableLocally + minimumPageSize))
          )
          // less than full page => no more transactions are available
          .mockReturnValueOnce(
            of(
              txs.slice(
                numberOfTransactionsAvailableLocally + minimumPageSize,
                numberOfTransactionsAvailableLocally + minimumPageSize * 2 - 1
              )
            )
          );
        // loadMore is called at these points in time
        const loadMore$ = hot('--b-c---e');

        expectObservable(merge(loader.loadedHistory$, loadMore$.pipe(tap(loader.loadMore), toEmpty))).toBe(
          'a-b-c-d-e-f',
          {
            a: {
              mightHaveMore: true,
              transactions: txs.slice(0, minimumPageSize)
            },
            b: {
              mightHaveMore: true,
              transactions: txs.slice(0, minimumPageSize * 2)
            },
            c: {
              mightHaveMore: true,
              transactions: txs.slice(0, numberOfTransactionsAvailableLocally + minimumPageSize)
            },
            d: {
              mightHaveMore: true,
              transactions: [newTx, ...txs.slice(0, numberOfTransactionsAvailableLocally + minimumPageSize)]
            },
            e: {
              mightHaveMore: false,
              transactions: [newTx, ...txs.slice(0, numberOfTransactionsAvailableLocally + minimumPageSize * 2 - 1)]
            },
            f: {
              mightHaveMore: false,
              transactions: txs.slice(0, numberOfTransactionsAvailableLocally + minimumPageSize * 2 - 1)
            }
          }
        );

        flush();
        expect(provider).toBeCalledTimes(2);
      });
    });
  });

  describe('with less than {minimumPageSize} transacstions in history$', () => {
    it.todo('TODO');
  });

  it.todo('reloads when addresses$ change');
});
