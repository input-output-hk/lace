import { combineLatest, distinctUntilChanged, filter, map } from 'rxjs';

import { isInMemoryMidnightAccount } from './utils';

import type { MidnightAccountProps } from './types';
import type { MidnightNetworkId } from './value-objects';
import type {
  AnyAccount,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/** Two account lists are the same run of accounts when their ids line up in
 * order — the identity the account stream re-emits on. */
const sameAccounts = (
  accounts1: InMemoryWalletAccount<MidnightAccountProps>[],
  accounts2: InMemoryWalletAccount<MidnightAccountProps>[],
) => {
  if (accounts1.length !== accounts2.length) return false;
  for (let index = 0; index < accounts1.length; index++) {
    if (accounts1[index].accountId !== accounts2[index].accountId) return false;
  }
  return true;
};

/** The state observables the stream reads — the structural subset every module
 * that depends on the wallet-repo and midnight-context store contracts has. */
export type MidnightAccountsStateObservables = {
  wallets: {
    selectActiveNetworkAccounts$: Observable<AnyAccount[]>;
    selectIsWalletRepoMigrating$: Observable<boolean>;
  };
  midnightContext: {
    selectMidnightBlockchainNetworkId$: Observable<
      MidnightNetworkId | undefined
    >;
  };
};

/**
 * The in-memory Midnight accounts on the active Midnight network, as a stream
 * that only re-emits when the run of account ids actually changes. Emits an
 * empty list while the wallet repo is migrating, so a consumer never acts on a
 * half-migrated repo. Nothing is emitted until a Midnight network is registered.
 */
export const midnightAccounts$ = (
  state: MidnightAccountsStateObservables,
): Observable<InMemoryWalletAccount<MidnightAccountProps>[]> =>
  combineLatest([
    state.wallets.selectActiveNetworkAccounts$,
    state.midnightContext.selectMidnightBlockchainNetworkId$.pipe(
      filter(Boolean),
    ),
    state.wallets.selectIsWalletRepoMigrating$,
  ]).pipe(
    map(([accounts, activeNetwork, isWalletRepoMigrating]) =>
      isWalletRepoMigrating
        ? []
        : accounts
            .filter(isInMemoryMidnightAccount)
            .filter(account => account.blockchainNetworkId === activeNetwork),
    ),
    distinctUntilChanged(sameAccounts),
  );
