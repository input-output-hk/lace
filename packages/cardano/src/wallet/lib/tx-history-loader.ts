import { Cardano, ChainHistoryProvider, TransactionsByAddressesArgs } from '@cardano-sdk/core';
import { ObservableWallet, pollProvider, PollProviderProps } from '@cardano-sdk/wallet';
import { toEmpty } from '@cardano-sdk/util-rxjs';
import {
  concat,
  EMPTY,
  exhaustMap,
  filter,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  Subject,
  switchMap,
  take
} from 'rxjs';
import { Logger } from 'ts-log';

/**
 * Similar to ChainHistoryProvider, but:
 * - returns an observable instead of promise for testability
 * - returns all transactions from last transaction block
 */
export type ObservableTransactionsByAddressesProvider = (
  args: TransactionsByAddressesArgs
) => Observable<Cardano.HydratedTx[]>;

type LoadedTxHistory = {
  transactions: Cardano.HydratedTx[];
  mightHaveMore: boolean;
};

type TxHistoryLoader = {
  loadMore: () => void;
  loadedHistory$: Observable<LoadedTxHistory>;
};

export type TxHistoryLoaderObservableWallet = {
  addresses$: ObservableWallet['addresses$'];
  transactions: {
    history$: ObservableWallet['transactions']['history$'];
  };
  syncStatus: {
    isSettled$: ObservableWallet['syncStatus']['isSettled$'];
  };
};

// eslint-disable-next-line consistent-return
const findIntersection = (storedHistory: Cardano.HydratedTx[], localHistory: Cardano.HydratedTx[]) => {
  for (let storedHistoryIndex = storedHistory.length - 1; storedHistoryIndex >= 0; storedHistoryIndex--) {
    const storedHistoryTx = storedHistory[storedHistoryIndex];
    for (const [localHistoryIndex, localTx] of localHistory.entries()) {
      if (storedHistoryTx.id === localTx.id && storedHistoryTx.blockHeader.hash === localTx.blockHeader.hash) {
        return { storedHistoryIndex, localHistoryIndex };
      }
    }
  }
};

export const createTxHistoryLoader = (
  provider: ObservableTransactionsByAddressesProvider,
  { addresses$, syncStatus: { isSettled$ }, transactions: { history$ } }: TxHistoryLoaderObservableWallet,
  minimumPageSize: number
): TxHistoryLoader => {
  const requestMore$ = new Subject<void>();
  let mightHaveMore = false;
  let fullLocalHistory: Cardano.HydratedTx[];
  let emittedHistory: Cardano.HydratedTx[];

  const initialPage = (storedHistory: Cardano.HydratedTx[]): LoadedTxHistory => {
    fullLocalHistory = [...storedHistory].reverse();
    mightHaveMore = fullLocalHistory.length > minimumPageSize;
    emittedHistory = fullLocalHistory.slice(0, minimumPageSize);
    return {
      transactions: emittedHistory,
      mightHaveMore
    };
  };

  const initialPage$ = concat(
    isSettled$.pipe(filter(Boolean), take(1), toEmpty),
    history$.pipe(take(1), map(initialPage))
  );

  const loadMore = (addresses: Cardano.PaymentAddress[]): Observable<LoadedTxHistory> => {
    const lastEmittedTxIndex = fullLocalHistory.indexOf(emittedHistory[emittedHistory.length - 1]);
    if (lastEmittedTxIndex < 0) {
      throw new Error('assertion failed: last emitted tx not found in full local history');
    }
    const nextPageStartAt = lastEmittedTxIndex + 1;
    const moreLocalTxs = fullLocalHistory.slice(nextPageStartAt, nextPageStartAt + minimumPageSize);
    const missingNumberOfTxs = minimumPageSize - moreLocalTxs.length;
    if (missingNumberOfTxs === 0) {
      emittedHistory = [...emittedHistory, ...moreLocalTxs];
      return of({
        transactions: emittedHistory,
        mightHaveMore
      });
    }
    const lastTx = moreLocalTxs[moreLocalTxs.length - 1] || emittedHistory[emittedHistory.length - 1];
    return provider({
      addresses,
      pagination: { startAt: 0, limit: missingNumberOfTxs, order: 'desc' },
      blockRange: { upperBound: Cardano.BlockNo(lastTx.blockHeader.blockNo - 1) }
    }).pipe(
      map((fetchedTxs) => {
        emittedHistory = fullLocalHistory = [...emittedHistory, ...moreLocalTxs, ...fetchedTxs];
        mightHaveMore = fetchedTxs.length >= missingNumberOfTxs;
        return {
          transactions: emittedHistory,
          mightHaveMore
        };
      })
    );
  };

  const watchTip$ = history$.pipe(
    mergeMap((storedHistory): Observable<LoadedTxHistory> => {
      const intersection = findIntersection(storedHistory, fullLocalHistory);
      if (!intersection) {
        return of(initialPage(storedHistory));
      }
      const newTransactions = storedHistory.slice(intersection.storedHistoryIndex + 1).reverse();
      if (intersection.localHistoryIndex === 0) {
        // prepend transactions if there are any new ones
        if (newTransactions.length > 0) {
          emittedHistory = [...newTransactions, ...emittedHistory];
          fullLocalHistory = [...newTransactions, ...fullLocalHistory];
          return of({
            transactions: emittedHistory,
            mightHaveMore
          });
        }
        return EMPTY;
      }
      // local history intersection is not at the tip - need to roll back
      fullLocalHistory = [...newTransactions, ...fullLocalHistory.slice(intersection.localHistoryIndex)];
      emittedHistory = [...newTransactions, ...emittedHistory.slice(intersection.localHistoryIndex)];
      return of({
        transactions: emittedHistory,
        mightHaveMore
      });
    })
  );

  return {
    loadedHistory$: addresses$.pipe(
      switchMap((addresses) =>
        concat(
          initialPage$,
          merge(watchTip$, requestMore$.pipe(exhaustMap(() => loadMore(addresses.map(({ address }) => address)))))
        )
      )
    ),
    loadMore: () => mightHaveMore && requestMore$.next()
  };
};

export const createObservableTransactionsByAddressesProvider =
  (
    provider: Pick<ChainHistoryProvider, 'transactionsByAddresses'>,
    retryBackoffConfig: PollProviderProps<unknown>['retryBackoffConfig'],
    logger: Logger
  ): ObservableTransactionsByAddressesProvider =>
  (args) =>
    pollProvider({
      logger,
      retryBackoffConfig,
      sample: async () => {
        if (args.pagination.order !== 'desc' || args.pagination.startAt !== 0) {
          throw new Error("assertion failed: provider supports only {order: 'desc', startAt: 0}");
        }
        const response = await provider.transactionsByAddresses(args);
        const transactions = response.pageResults;
        if (transactions.length === 0) return transactions;
        const lastBlockHeight = transactions[transactions.length - 1].blockHeader.blockNo;
        // PERF: this could be optimized to not re-fetch last tx details
        const lastTxBlockTransactions = await provider.transactionsByAddresses({
          ...args,
          pagination: {
            // supports up to 100 transactions in 1 block
            limit: 100,
            startAt: 0,
            order: 'desc'
          },
          blockRange: {
            lowerBound: lastBlockHeight,
            upperBound: lastBlockHeight
          }
        });
        return [
          ...transactions,
          ...lastTxBlockTransactions.pageResults.filter((extraTx) => !transactions.some((tx) => tx.id === extraTx.id))
        ];
      }
    });
