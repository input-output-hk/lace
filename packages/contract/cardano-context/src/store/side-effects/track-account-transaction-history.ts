import {
  createTrackAccountTransactionHistory,
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
    const [actionObservables, { activities, cardanoContext, sync }] = params;

    const loadOlderActivitiesObservable$ = getLoadOlderActivitiesObservable({
      actionObservables,
      activities,
      cardanoContext,
      sync,
    });

    return createTrackAccountTransactionHistory(
      fetchAddressTransactionHistories,
      loadOlderActivitiesObservable$,
    )(...params);
  };
