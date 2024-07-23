import { combineLatest, Observable, of, concat } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '../StoreProvider';
import { WalletStatusProps, Status } from '../../components/WalletStatus';
import { useMemo } from 'react';
import { NetworkConnectionStates } from '@src/types';

const text = {
  synced: 'browserView.topNavigationBar.walletStatus.walletSynced',
  notSynced: 'browserView.topNavigationBar.walletStatus.notSyncedToTheBlockchain',
  syncing: 'browserView.topNavigationBar.walletStatus.walletSyncing'
};

export const getWalletStatus = (status: {
  syncing: boolean;
  synced: boolean;
  isStartingSync: boolean;
  offline: boolean;
}): WalletStatusProps => {
  /* check if the wallet is syncing the first time
   this is needed because by default the status.synced is false
   so without this when the wallet was syncing the first time we were displaying the not synced status   */
  if (status.isStartingSync && !status.offline) {
    return {
      status: Status.SYNCING,
      text: text.syncing
    };
  }

  if (status.offline) {
    return {
      status: Status.NOT_SYNCED,
      text: text.notSynced
    };
  }
  /* because syncing is not mutually exclusive with synced, first we need to check for the status.synced = true
   and then check if the wallet is syncing or not */

  if (status.synced)
    return status.syncing
      ? {
          status: Status.SYNCING,
          text: text.syncing
        }
      : {
          status: Status.SYNCED,
          text: text.synced
        };

  return {
    status: Status.NOT_SYNCED,
    text: text.notSynced
  };
};

const transformSyncStatusObservables = (
  syncStatus: Wallet.ObservableWallet['syncStatus'],
  networkConnection: NetworkConnectionStates
) => {
  const { isAnyRequestPending$, isUpToDate$, isSettled$ } = syncStatus;

  // added this to check if there is no internet connection
  const offline$ = of(networkConnection).pipe(map((connection) => connection === NetworkConnectionStates.OFFLINE));

  /* this is needed to check if the wallet is syncing the first time
    by default is going to be true but after isSettled$ emits the first time
    we know that the wallet has been syncing at least once
    so force the value false */
  const isStarting$ = concat(
    of(true),
    isSettled$.pipe(
      filter((s: boolean) => s),
      map(() => false),
      take(1)
    )
  );

  return combineLatest({
    syncing: isAnyRequestPending$,
    synced: isUpToDate$,
    isStartingSync: isStarting$,
    offline: offline$
  }).pipe(
    map((value: { syncing: boolean; synced: boolean; isStartingSync: boolean; offline: boolean }) =>
      getWalletStatus(value)
    )
  );
};

export const useSyncStatus = (): Observable<WalletStatusProps> => {
  const syncStatus = useWalletStore((state) => state.inMemoryWallet.syncStatus);
  const networkConnection = useWalletStore((state) => state.walletUI.networkConnection);
  return useMemo(() => transformSyncStatusObservables(syncStatus, networkConnection), [syncStatus, networkConnection]);
};
