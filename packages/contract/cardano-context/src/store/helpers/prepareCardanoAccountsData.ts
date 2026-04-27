import { AccountId } from '@lace-contract/wallet-repo';
import { combineLatest, filter, map, type Observable } from 'rxjs';

import { groupCardanoAddressesByAccount } from './group-cardano-addresses-by-account';

import type { Selectors } from '../../contract';
import type { CardanoAddressData } from '../../types';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type { StateObservables } from '@lace-contract/module';

export type AccountMetadata = {
  accountId: AccountId;
  accountAddresses: AnyAddress<CardanoAddressData>[];
  chainId: Cardano.ChainId;
  total: number;
};

/**
 * Groups Cardano addresses by account, and prepares metadata.
 *
 * Returns an observable of **arrays** so that downstream consumers can use
 * `switchMap` to tear down and recreate per-account streams when the set of
 * accounts changes (e.g. wallet removed then restored with the same IDs).
 */
export const prepareCardanoAccountsData = (
  stateObservables: StateObservables<Selectors>,
): Observable<AccountMetadata[]> => {
  const {
    addresses: { selectAllAddresses$ },
    cardanoContext: { selectChainId$, selectAccountTransactionsTotal$ },
  } = stateObservables;

  return combineLatest([
    selectAllAddresses$,
    selectChainId$.pipe(filter(Boolean)),
    selectAccountTransactionsTotal$,
  ]).pipe(
    filter(
      ([, , accountTransactionsTotal]) =>
        Object.keys(accountTransactionsTotal).length > 0,
    ),
    map(([addresses, chainId, accountTransactionsTotal]) => {
      const addressesGroupedByAccount = groupCardanoAddressesByAccount(
        addresses,
        chainId,
      );
      return Object.entries(addressesGroupedByAccount)
        .filter(
          ([accountIdString]) =>
            AccountId(accountIdString) in accountTransactionsTotal,
        )
        .map(([accountIdString, accountAddresses]) => ({
          accountId: AccountId(accountIdString),
          accountAddresses,
          chainId,
          total: accountTransactionsTotal[AccountId(accountIdString)],
        }));
    }),
  );
};
