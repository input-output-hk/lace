import { useEffect, useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { Wallet } from '@lace/cardano';
import { DEFAULT_POLLING_CONFIG } from '@cardano-sdk/wallet';
import { useObservable } from '@lace/common';
import { ObservedValueOf } from 'rxjs';

const TX_HISTORY_LOADING = {
  transactions: undefined as Wallet.Cardano.HydratedTx[],
  mightHaveMore: false
};

type TxHistoryLoader = ReturnType<typeof Wallet.createTxHistoryLoader>;

export type UseTxHistoryLoader = {
  loadMore: TxHistoryLoader['loadMore'];
  retry: TxHistoryLoader['retry'];
  error: ObservedValueOf<TxHistoryLoader['error$']>;
  loadedHistory: {
    transactions: Wallet.Cardano.HydratedTx[];
    mightHaveMore: boolean;
  };
};

export const useTxHistoryLoader = (pageSize: number): UseTxHistoryLoader => {
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

  // eslint-disable-next-line unicorn/no-null
  const error = useObservable(txHistoryLoader.error$, null);

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
      retry: txHistoryLoader.retry,
      loadedHistory,
      error
    }),
    [loadedHistory, error, txHistoryLoader.loadMore, txHistoryLoader.retry]
  );
};
