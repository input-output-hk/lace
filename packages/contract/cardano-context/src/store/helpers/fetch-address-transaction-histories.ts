import {
  PROVIDER_REQUEST_RETRY_CONFIG,
  isRetriableError,
} from '@lace-lib/util-provider';
import { Err, Ok, Result } from '@lace-sdk/util';
import { retryBackoff } from 'backoff-rxjs';
import {
  EMPTY,
  catchError,
  expand,
  forkJoin,
  last,
  map,
  mergeMap,
  of,
  throwError,
} from 'rxjs';

import { CardanoPaymentAddress } from '../../types';

import {
  buildEndAtParamsFromTx,
  buildStartAtParamsFromTx,
} from './get-next-tx-history-page-params';

import type {
  CardanoAddressData,
  CardanoAddressTransactionHistoryMap,
  CardanoProvider,
  CardanoTransactionHistoryItem,
} from '../../types';
import type { Cardano } from '@cardano-sdk/core';
import type { ProviderError } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type { Observable } from 'rxjs';

const MAX_TRANSACTIONS_PER_REQUEST = 100;

/**
 * Handles the results of multiple address transaction history fetches.
 *
 * @param {FetchAddressTransactionHistoryResult[]} results - The results of the transaction history fetches.
 *
 * @return {Observable<FetchAddressTransactionHistoryResult>} The result of the transaction history fetches.
 */
const handleResults = (results: FetchAddressTransactionHistoryResult[]) => {
  // If any request failed, return it and throw away all others
  // PERF: we could handle individual request failures more gracefully
  for (const r of results) {
    if (r.isErr()) return of(r);
  }
  // all requests are OK, return them combined
  return of(Result.all(results));
};

/**
 * Handles the result of a single address transaction history fetch.
 *
 * @param {Object} params - The parameters to handle the result.
 * @param {Result<CardanoTransactionHistoryItem[], ProviderError<unknown>>} params.result - The result of the transaction history fetch.
 * @param {CardanoPaymentAddress} params.address - The address of the transaction history.
 * @param {CardanoAddressTransactionHistoryMap[CardanoPaymentAddress]} params.addressHistory - The address history of the transaction history.
 * @param {CardanoTransactionHistoryItem} params.newestTx - The newest transaction in the address history.
 * @param {number} params.numberOfItems - The number of transaction items to load for each request.
 *
 * @return {FetchAddressTransactionHistoryResult} The result of the transaction history fetch.
 */
const handleResult = ({
  result,
  address,
  addressHistory,
  newestTx,
  numberOfItems,
}: {
  result: Result<CardanoTransactionHistoryItem[], ProviderError<unknown>>;
  address: CardanoPaymentAddress;
  addressHistory: CardanoAddressTransactionHistoryMap[CardanoPaymentAddress];
  newestTx?: CardanoTransactionHistoryItem;
  numberOfItems: number;
}): FetchAddressTransactionHistoryResult => {
  return result.mapOrElse<FetchAddressTransactionHistoryResult>(
    error =>
      Err({
        address,
        error,
      }),
    fetchedTransactionHistory => {
      // sort fetched transaction history by block time in descending order to ensure that the newer transactions are at the beginning of the array
      const sortedFetchedTransactionHistory = fetchedTransactionHistory.sort(
        (a, b) =>
          Number(b.blockTime) - Number(a.blockTime) ||
          Number(b.txIndex) - Number(a.txIndex),
      );
      // prepend fetched history items to existing history if loading newer transactions
      // otherwise append fetched history items to existing history
      const transactionHistory = newestTx
        ? sortedFetchedTransactionHistory.concat(
            addressHistory.transactionHistory,
          )
        : addressHistory.transactionHistory.concat(
            sortedFetchedTransactionHistory,
          );

      const hasLoadedOldestEntry = newestTx
        ? addressHistory.transactionHistory.length === 0
          ? // mark as loaded if the response length
            // was less than the expected number of items to load
            // and the address has no history yet
            fetchedTransactionHistory.length < numberOfItems
          : addressHistory.hasLoadedOldestEntry
        : fetchedTransactionHistory.length < numberOfItems;

      return Ok({
        address,
        transactionHistory,
        hasLoadedOldestEntry,
      });
    },
  );
};

export type FetchAddressTransactionHistoriesParams = {
  addresses: AnyAddress<CardanoAddressData>[];
  addressesHistories: CardanoAddressTransactionHistoryMap;
  numberOfItems: number;
  chainId: Cardano.ChainId;
  getAddressTransactionHistory: CardanoProvider['getAddressTransactionHistory'];
};

type FetchAddressTransactionHistoryResponse = {
  address: CardanoPaymentAddress;
  transactionHistory: CardanoTransactionHistoryItem[];
  hasLoadedOldestEntry: boolean;
};

type FetchAddressTransactionHistoryError = {
  address: CardanoPaymentAddress;
  error: ProviderError;
};

// Result for an individual address
type FetchAddressTransactionHistoryResult = Result<
  FetchAddressTransactionHistoryResponse,
  FetchAddressTransactionHistoryError
>;

// Result for all addresses combined
export type FetchAddressTransactionHistoriesResult = Result<
  FetchAddressTransactionHistoryResponse[],
  FetchAddressTransactionHistoryError
>;

export type FetchAddressTransactionHistoriesResponse =
  Observable<FetchAddressTransactionHistoriesResult>;

/**
 * Fetches transaction histories for a set of addresses, ensuring that histories for addresses
 * which have already loaded their oldest entries are not requested again. This function supports
 * paginated loading of transaction histories and combines the results into a unified stream.
 *
 * If any individual request to fetch the history of an account address fails, then only the failed
 * result is returned and all potentially successful results are thrown away to avoid inconsistency.
 *
 * @param {Object} params - The parameters to fetch transaction histories.
 * @param {Array} params.addresses - An array of address objects to fetch transaction histories for.
 * @param {Object} params.addressesHistories - A mapping of addresses to their respective transaction histories including metadata indicating if the oldest entry has been loaded.
 * @param {number} params.numberOfItems - The number of transaction items to load for each request.
 * @param {string} params.chainId - The network info for which the transaction histories are being fetched.
 * @param {Function} params.getAddressTransactionHistory - A function to fetch the transaction history for a specific address, accepting parameters for pagination and blockchain context.
 *
 * @return {Observable} Returns an observable stream of results with metadata about the individual request
 */
export const fetchAddressTransactionHistories = ({
  addresses,
  addressesHistories,
  numberOfItems,
  chainId,
  getAddressTransactionHistory,
}: FetchAddressTransactionHistoriesParams): FetchAddressTransactionHistoriesResponse =>
  forkJoin(
    addresses
      // Avoid requests for addresses where the oldest entry was already loaded
      .filter(
        a =>
          !addressesHistories[CardanoPaymentAddress(a.address)]
            ?.hasLoadedOldestEntry,
      )
      // Load more history for addresses which have not been completely loaded yet
      .map(a => {
        const address = CardanoPaymentAddress(a.address);
        const addressHistory = addressesHistories[address] ?? {
          hasLoadedOldestEntry: false,
          transactionHistory: [],
        };

        const { transactionHistory } = addressHistory;
        const oldestTx =
          transactionHistory[transactionHistory.length - 1] ?? undefined;

        return getAddressTransactionHistory(
          {
            address,
            numberOfItems,
            ...(oldestTx ? buildStartAtParamsFromTx(oldestTx) : {}),
          },
          {
            chainId,
          },
        ).pipe(
          map(result => {
            const handledResult = handleResult({
              result,
              address,
              addressHistory,
              numberOfItems,
            });
            if (handledResult.isErr()) {
              throwError(() => handledResult);
            }
            return handledResult;
          }),
        );
      }),
  ).pipe(
    mergeMap(handleResults),
    catchError(error => of(error as Err<FetchAddressTransactionHistoryError>)),
  );

// Wraps the per-address failure in an Error so retryBackoff can observe a
// thrown Error (satisfying lint's only-throw-error) while still carrying the
// address context we need to reconstruct the outer Err value after retries.
class FetchAddressTransactionHistoryThrowable extends Error {
  public constructor(readonly payload: FetchAddressTransactionHistoryError) {
    super(payload.error.message);
  }
}

type FetchAllNewerPagesForAddressParams = {
  address: CardanoPaymentAddress;
  chainId: Cardano.ChainId;
  numberOfItems: number;
  newestTx: CardanoTransactionHistoryItem | undefined;
  getAddressTransactionHistory: CardanoProvider['getAddressTransactionHistory'];
};

type PageState = {
  pages: CardanoTransactionHistoryItem[][];
  cursor: CardanoTransactionHistoryItem | undefined;
  remaining: number;
  error?: ProviderError;
};

/**
 * Sequentially fetches newer-tx pages for a single address until either
 * `numberOfItems` is reached or the provider returns a short page (meaning
 * no more newer txs exist). Returns the aggregated items in a single Result,
 * matching the shape of a single provider call so the downstream merge /
 * error / retry logic stays unchanged.
 *
 * Pagination is sequential (not forkJoin) because each page's cursor is
 * derived from the newest tx of the previous page (see `buildEndAtParamsFromTx`).
 */
const fetchAllNewerPagesForAddress = ({
  address,
  chainId,
  numberOfItems,
  newestTx: initialNewestTx,
  getAddressTransactionHistory,
}: FetchAllNewerPagesForAddressParams): Observable<
  Result<CardanoTransactionHistoryItem[], ProviderError>
> => {
  if (numberOfItems <= 0) return of(Ok([]));

  const initialState: PageState = {
    pages: [],
    cursor: initialNewestTx,
    remaining: numberOfItems,
  };

  return of<PageState>(initialState).pipe(
    expand(state => {
      if (state.remaining <= 0 || state.error) return EMPTY;
      const pageSize = Math.min(MAX_TRANSACTIONS_PER_REQUEST, state.remaining);
      return getAddressTransactionHistory(
        {
          address,
          numberOfItems: pageSize,
          ...(state.cursor ? buildEndAtParamsFromTx(state.cursor) : {}),
        },
        { chainId },
      ).pipe(
        map((result): PageState => {
          if (result.isErr()) {
            return { ...state, error: result.unwrapErr(), remaining: 0 };
          }
          const page = result.unwrap();
          // Stop if the page came back short OR if we had no cursor for this
          // request. The no-cursor case means the provider returned its
          // default (desc) order, so `page[page.length-1]` is the oldest
          // item — unsafe to use as a forward-pagination anchor.
          if (page.length < pageSize || !state.cursor) {
            return { ...state, pages: [...state.pages, page], remaining: 0 };
          }
          // Provider returned ascending order (see buildEndAtParamsFromTx),
          // so the newest tx of the page is the last element.
          return {
            pages: [...state.pages, page],
            cursor: page[page.length - 1],
            remaining: state.remaining - page.length,
          };
        }),
      );
    }),
    last(),
    map(state => (state.error ? Err(state.error) : Ok(state.pages.flat()))),
  );
};

/**
 * Fetches newer transactions for the given addresses in parallel.
 *
 * Retries retriable provider errors with exponential backoff before surfacing
 * a failure. Per-address failures are thrown wrapped in a
 * `FetchAddressTransactionHistoryThrowable` so `retryBackoff` can observe
 * them; after retries are exhausted, `catchError` unwraps the payload back
 * into an `Err<FetchAddressTransactionHistoryError>` value so callers see
 * the same contract as the all-ok path.
 */
export const fetchNewAddressTransactionHistories = ({
  addresses,
  addressesHistories,
  numberOfItems,
  chainId,
  getAddressTransactionHistory,
}: FetchAddressTransactionHistoriesParams): FetchAddressTransactionHistoriesResponse =>
  forkJoin(
    addresses.map(a => {
      const address = CardanoPaymentAddress(a.address);
      const addressHistory = addressesHistories[address] ?? {
        hasLoadedOldestEntry: false,
        transactionHistory: [],
      };

      const { transactionHistory } = addressHistory;
      const newestTx = transactionHistory[0] ?? undefined;

      return fetchAllNewerPagesForAddress({
        address,
        chainId,
        numberOfItems,
        newestTx,
        getAddressTransactionHistory,
      }).pipe(
        map(result => {
          const handledResult = handleResult({
            result,
            address,
            addressHistory,
            numberOfItems,
            newestTx,
          });
          if (handledResult.isErr()) {
            throw new FetchAddressTransactionHistoryThrowable(
              handledResult.unwrapErr(),
            );
          }
          return handledResult;
        }),
      );
    }),
  ).pipe(
    mergeMap(handleResults),
    retryBackoff({
      ...PROVIDER_REQUEST_RETRY_CONFIG,
      shouldRetry: (error: unknown) =>
        error instanceof FetchAddressTransactionHistoryThrowable
          ? isRetriableError(error.payload.error)
          : isRetriableError(error),
    }),
    catchError((error: unknown) => {
      if (error instanceof FetchAddressTransactionHistoryThrowable) {
        return of(Err(error.payload));
      }
      // Unexpected errors (not wrapped by the map above) — rethrow so they
      // surface rather than being silently swallowed.
      throw error;
    }),
  );
