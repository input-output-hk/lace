import React, { useMemo } from 'react';
import { Main as Nami, OutsideHandlesProvider } from '@lace/nami';
import '../../lib/scripts/keep-alive-ui';
import { useWalletStore } from '@src/stores';
import { cardanoTransformer } from '@src/utils/assets-transformers';
import { useObservable } from '@lace/common';
import { useCurrencyStore } from '@providers';
import { useAppInit, useFetchCoinPrice } from '@hooks';
import { MainLoader } from '@components/MainLoader';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import './index.scss';

export const NamiPopup = (): React.ReactElement => {
  const {
    walletUI: { cardanoCoin },
    inMemoryWallet,
    walletInfo,
    cardanoWallet,
    walletState,
    initialHdDiscoveryCompleted,
    currentChain
  } = useWalletStore();

  useAppInit();

  const walletAddress = walletInfo?.addresses[0].address.toString();
  const fullWalletName = cardanoWallet?.source.wallet.metadata.name;

  const { fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const utxoTotal = useObservable(inMemoryWallet?.balance.utxo.total$);
  const rewards = useObservable(inMemoryWallet?.balance.rewardAccounts.rewards$);

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
            transformedCardano,
            walletAddress,
            fullWalletName,
            inMemoryWallet,
            currentChain,
            withSignTxConfirmation
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
