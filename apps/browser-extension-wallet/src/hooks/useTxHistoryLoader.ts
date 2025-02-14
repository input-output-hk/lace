import { useEffect, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { Wallet } from '@lace/cardano';
import { DEFAULT_POLLING_CONFIG } from '@cardano-sdk/wallet';
import { useObservable } from '@lace/common';

const TX_HISTORY_LOADING = {
  transactions: undefined as Wallet.Cardano.HydratedTx[],
  mightHaveMore: false
};

export const useTxHistoryLoader = (
  pageSize: number
): {
  loadMore: ReturnType<typeof Wallet.createTxHistoryLoader>['loadMore'];
  loadedHistory: {
    transactions: Wallet.Cardano.HydratedTx[];
    mightHaveMore: boolean;
  };
} => {
  const {
    blockchainProvider: { chainHistoryProvider },
    cardanoWallet
  } = useWalletStore();

  const provider = useMemo(
    () =>
      Wallet.createObservableTransactionsByAddressesProvider(
        chainHistoryProvider,
        {
          initialInterval: DEFAULT_POLLING_CONFIG.pollInterval,
          maxInterval: DEFAULT_POLLING_CONFIG.pollInterval * DEFAULT_POLLING_CONFIG.maxIntervalMultiplier
        },
        console
      ),
    [chainHistoryProvider]
  );

  const txHistoryLoader = useMemo(
    () => Wallet.createTxHistoryLoader(provider, cardanoWallet.wallet, pageSize),
    [cardanoWallet.wallet, pageSize, provider]
  );

  const loadedHistory = useObservable(txHistoryLoader.loadedHistory$, TX_HISTORY_LOADING);

  useEffect(() => {
    if (
      loadedHistory.transactions?.length &&
      loadedHistory.transactions?.length < pageSize &&
      loadedHistory.mightHaveMore
    ) {
      txHistoryLoader.loadMore();
    }
  }, [loadedHistory.mightHaveMore, loadedHistory.transactions?.length, pageSize, txHistoryLoader]);

  return useMemo(
    () => ({
      loadMore: txHistoryLoader.loadMore,
      loadedHistory
    }),
    [loadedHistory, txHistoryLoader.loadMore]
  );
};
