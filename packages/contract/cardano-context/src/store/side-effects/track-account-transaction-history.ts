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
 * Side effect that fetches newer transaction history for all accounts.
 *
 * Triggers reactively when `accountTransactionsTotal` changes for an account
 * (new transaction detected) or when a new account is discovered.
 */
export const createTrackNewerAccountTransactionHistory =
  (
    fetchAddressTransactionHistories: (
      params: FetchAddressTransactionHistoriesParams,
    ) => FetchAddressTransactionHistoriesResponse,
  ): SideEffect =>
  (...props) => {
    const [, stateObservables] = props;

    const pollingObservable$ = getPollTransactionsObservable(stateObservables);

    return createTrackAccountTransactionHistory(
      fetchAddressTransactionHistories,
      pollingObservable$,
    )(...props);
  };
