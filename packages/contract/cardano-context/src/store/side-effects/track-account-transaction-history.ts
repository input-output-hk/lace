import {
  createTrackAccountTransactionHistory,
  getPollTransactionsObservable,
  getLoadOlderActivitiesObservable,
} from './create-track-account-transaction-history';

import type { SideEffect } from '../../contract';
import type {
  FetchAddressTransactionHistoriesParams,
  FetchAddressTransactionHistoriesResponse,
} from '../helpers/fetch-address-transaction-histories';
import type { Milliseconds } from '@lace-sdk/util';

/**
 * Side effect that tracks account transaction history by fetching more data
 * from all account addresses that are not yet fully loaded.
 */
export const createTrackOlderAccountTransactionHistory =
  (
    fetchAddressTransactionHistories: (
      params: FetchAddressTransactionHistoriesParams,
    ) => FetchAddressTransactionHistoriesResponse,
  ): SideEffect =>
  (...params) => {
    const [, { activities, cardanoContext, sync }] = params;

    const loadOlderActivitiesObservable$ = getLoadOlderActivitiesObservable(
      activities,
      cardanoContext,
      sync,
    );

    return createTrackAccountTransactionHistory(
      fetchAddressTransactionHistories,
      loadOlderActivitiesObservable$,
    )(...params);
  };

/**
 * Side effect that polls newer transaction history
 * for all accounts addresses.
 */
export const createTrackNewerAccountTransactionHistory =
  (
    fetchAddressTransactionHistories: (
      params: FetchAddressTransactionHistoriesParams,
    ) => FetchAddressTransactionHistoriesResponse,
    pollingIntervalSeconds: Milliseconds,
  ): SideEffect =>
  (...props) => {
    const [actionObservables, { addresses }] = props;

    const pollingObservable$ = getPollTransactionsObservable(
      actionObservables,
      addresses,
      pollingIntervalSeconds,
    );

    return createTrackAccountTransactionHistory(
      fetchAddressTransactionHistories,
      pollingObservable$,
    )(...props);
  };
