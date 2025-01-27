import { useMemo } from 'react';
import { useWalletStore } from '@src/stores';
import { Wallet } from '@lace/cardano';
import { DEFAULT_POLLING_CONFIG } from '@cardano-sdk/wallet';

export const useTxHistoryLoader = (pageSize: number): ReturnType<typeof Wallet.createTxHistoryLoader> => {
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

  return useMemo(
    () => Wallet.createTxHistoryLoader(provider, cardanoWallet.wallet, pageSize),
    [cardanoWallet.wallet, pageSize, provider]
  );
};
