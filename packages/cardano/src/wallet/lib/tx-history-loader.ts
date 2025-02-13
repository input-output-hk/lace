import { Cardano, ChainHistoryProvider, TransactionsByAddressesArgs } from '@cardano-sdk/core';
import { ObservableWallet, pollProvider, PollProviderProps, txEquals } from '@cardano-sdk/wallet';
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

/* TODO: Copied from SDK. Should be refactored to be imported from SDK.
 * Initial page is sliced to hardcoded 10 in Lace storage initialization.
 * Either update to slice in whole blocks or remove the slice altogether.
 */

/**
 * Sorts the given HydratedTx by slot.
 *
 * @param lhs The left-hand side of the comparison operation.
 * @param rhs The left-hand side of the comparison operation.
 */
const compareTxOrder = (lhs: Cardano.HydratedTx, rhs: Cardano.HydratedTx) =>
  lhs.blockHeader.slot - rhs.blockHeader.slot || lhs.index - rhs.index;

/**
 * Deduplicates the given array of HydratedTx.
 * Copied from SDK. Should be refactored to be imported from SDK
 *
 * @param arr The array of HydratedTx to deduplicate.
 * @param isEqual The equality function to use to determine if two HydratedTx are equal.
 */
const deduplicateSortedArray = (
  arr: Cardano.HydratedTx[],
  isEqual: (a: Cardano.HydratedTx, b: Cardano.HydratedTx) => boolean
) => {
  if (arr.length === 0) {
    return [];
  }

  const result = [arr[0]];

  for (let i = 1; i < arr.length; ++i) {
    if (!isEqual(arr[i], arr[i - 1])) {
      result.push(arr[i]);
    }
  }

  return result;
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
  let isFirstFetch = true;

  const initialPage = (storedHistory: Cardano.HydratedTx[]): LoadedTxHistory => {
    fullLocalHistory = [...storedHistory].reverse();
    // Always try to fetch more for the first page (unless there are less items then minimumPageSize value).
    // The first page is limited to 10 elements and the viewPort height might fit more
    mightHaveMore = fullLocalHistory.length >= minimumPageSize;
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
    let missingNumberOfTxs = minimumPageSize - moreLocalTxs.length;
    if (missingNumberOfTxs === 0) {
      emittedHistory = [...emittedHistory, ...moreLocalTxs];
      return of({
        transactions: emittedHistory,
        mightHaveMore
      });
    }
    const lastTx = moreLocalTxs[moreLocalTxs.length - 1] || emittedHistory[emittedHistory.length - 1];
    let upperBound = Cardano.BlockNo(lastTx.blockHeader.blockNo - 1);
    if (isFirstFetch) {
      upperBound = Cardano.BlockNo(lastTx.blockHeader.blockNo);
      missingNumberOfTxs += fullLocalHistory.filter(
        (tx) => tx.blockHeader.blockNo === lastTx.blockHeader.blockNo
      ).length;
    }

    return provider({
      addresses,
      pagination: { startAt: 0, limit: missingNumberOfTxs, order: 'desc' },
      blockRange: { upperBound }
    }).pipe(
      map((fetchedTxs) => {
        fullLocalHistory = [...emittedHistory, ...moreLocalTxs, ...fetchedTxs];
        if (isFirstFetch) {
          isFirstFetch = false;
          fullLocalHistory = deduplicateSortedArray(fullLocalHistory.sort(compareTxOrder).reverse(), txEquals);
        }
        emittedHistory = fullLocalHistory;
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
        const fetchedTransactions = response.pageResults;
        const transactionsToEmit = fetchedTransactions.slice(0, args.pagination.limit);
        if (transactionsToEmit.length === 0) return transactionsToEmit;
        const lastBlockHeight = transactionsToEmit[transactionsToEmit.length - 1].blockHeader.blockNo;
        // add transactions from the same block as last tx in the slice that we're going to emit
        const droppedTransactions = fetchedTransactions.slice(args.pagination.limit);
        for (const tx of droppedTransactions) {
          if (tx.blockHeader.blockNo >= lastBlockHeight) {
            transactionsToEmit.push(tx);
          } else {
            break;
          }
        }
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
          ...transactionsToEmit,
          ...lastTxBlockTransactions.pageResults.filter(
            (extraTx) => !transactionsToEmit.some((tx) => tx.id === extraTx.id)
          )
        ];
      }
    });
