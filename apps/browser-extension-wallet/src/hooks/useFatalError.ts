import { ObservableWallet } from '@cardano-sdk/wallet';
import { useObservable } from '@lace/common';
import { useBackgroundServiceAPIContext } from '@providers';
import { useWalletStore } from '@src/stores';
import { useMemo } from 'react';
import { catchError, take, of, merge, EMPTY } from 'rxjs';
import { toEmpty } from '@cardano-sdk/util-rxjs';
import { getErrorMessage } from '@src/utils/get-error-message';

const anyError = (wallet: ObservableWallet | undefined) =>
  wallet
    ? merge(
        wallet.addresses$,
        wallet.assetInfo$,
        wallet.balance.rewardAccounts.deposit$,
        wallet.balance.rewardAccounts.rewards$,
        wallet.balance.utxo.available$,
        wallet.balance.utxo.total$,
        wallet.balance.utxo.unspendable$,
        wallet.currentEpoch$,
        wallet.delegation.distribution$,
        wallet.delegation.portfolio$,
        wallet.delegation.rewardAccounts$,
        wallet.delegation.rewardsHistory$,
        wallet.eraSummaries$,
        wallet.genesisParameters$,
        wallet.handles$,
        wallet.protocolParameters$,
        wallet.governance.isRegisteredAsDRep$,
        wallet.publicStakeKeys$,
        wallet.syncStatus.isAnyRequestPending$,
        wallet.syncStatus.isSettled$,
        wallet.syncStatus.isUpToDate$,
        wallet.tip$,
        wallet.transactions.history$,
        wallet.transactions.rollback$,
        wallet.utxo.available$,
        wallet.utxo.total$,
        wallet.utxo.unspendable$
      ).pipe(
        toEmpty,
        catchError((error) => of({ type: 'base-wallet-error', message: getErrorMessage(error) })),
        take(1)
      )
    : EMPTY;

type FatalError = {
  type: string;
  message: string;
};

export const useFatalError = (): FatalError | undefined => {
  const backgroundService = useBackgroundServiceAPIContext();
  const unhandledServiceWorkerError = useObservable(backgroundService.unhandledError$);
  const { cardanoWallet } = useWalletStore();
  const walletError$ = useMemo(() => anyError(cardanoWallet?.wallet), [cardanoWallet?.wallet]);
  const walletError = useObservable(walletError$);

  if (unhandledServiceWorkerError) {
    console.error('useFatalError (service worker):', unhandledServiceWorkerError);
  }

  if (walletError) {
    console.error('useFatalError (wallet):', walletError);
  }

  return unhandledServiceWorkerError || walletError;
};
