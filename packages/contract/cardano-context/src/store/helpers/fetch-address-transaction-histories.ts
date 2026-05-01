import { Err, Ok, Result } from '@lace-sdk/util';
import { catchError, forkJoin, map, mergeMap, of, throwError } from 'rxjs';

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

      return getAddressTransactionHistory(
        {
          address,
          numberOfItems,
          ...(newestTx ? buildEndAtParamsFromTx(newestTx) : {}),
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
            newestTx,
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
