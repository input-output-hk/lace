import React, { useMemo } from 'react';
import { Main as Nami, OutsideHandlesProvider } from '@lace/nami';
import { useWalletStore } from '@src/stores';
import { cardanoTransformer } from '@src/utils/assets-transformers';
import { useObservable } from '@lace/common';
import { useCurrencyStore, useTheme } from '@providers';
import { useAppInit, useFetchCoinPrice, useWalletManager } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { walletManager, walletRepository, withSignTxConfirmation } from '@lib/wallet-api-ui';
import '../../lib/scripts/keep-alive-ui';
import './index.scss';

export const NamiPopup = (): React.ReactElement => {
  const { setFiatCurrency, fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const { createWallet, getMnemonic, deleteWallet } = useWalletManager();
  const {
    walletUI: { cardanoCoin },
    inMemoryWallet,
    walletInfo,
    cardanoWallet,
    walletState,
    initialHdDiscoveryCompleted,
    currentChain
  } = useWalletStore();
  const { theme, setTheme } = useTheme();
  const utxoTotal = useObservable(inMemoryWallet?.balance.utxo.total$);
  const rewards = useObservable(inMemoryWallet?.balance.rewardAccounts.rewards$);

  useAppInit();

  const walletAddress = walletInfo?.addresses[0].address.toString();

  const transformedCardano = useMemo(
    () =>
      cardanoTransformer({
        total: {
          ...utxoTotal,
          coins: BigInt(utxoTotal?.coins || 0) + BigInt(rewards || 0)
        },
        fiatPrice: priceResult?.cardano,
        cardanoCoin,
        fiatCode: fiatCurrency?.code
      }),
    [cardanoCoin, fiatCurrency?.code, priceResult?.cardano, utxoTotal, rewards]
  );

  return (
    <div id="nami-mode">
      {!!cardanoWallet && walletInfo && walletState && inMemoryWallet && initialHdDiscoveryCompleted && currentChain ? (
        <OutsideHandlesProvider
          {...{
            createWallet,
            getMnemonic,
            deleteWallet,
            fiatCurrency: fiatCurrency.code,
            setFiatCurrency,
            theme: theme.name,
            setTheme,
            transformedCardano,
            walletAddress,
            inMemoryWallet,
            currentChain,
            withSignTxConfirmation,
            walletManager,
            walletRepository
          }}
        >
          <Nami />
        </OutsideHandlesProvider>
      ) : (
        <MainLoader />
      )}
    </div>
  );
};
