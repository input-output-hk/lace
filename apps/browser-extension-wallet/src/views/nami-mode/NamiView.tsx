import React, { useCallback, useMemo } from 'react';
import { Main as Nami, OutsideHandlesProvider } from '@lace/nami';
import { useWalletStore } from '@src/stores';
import { config } from '@src/config';
import { useCurrencyStore, useTheme } from '@providers';
import { useCustomSubmitApi, useWalletAvatar, useCollateral, useFetchCoinPrice, useWalletManager } from '@hooks';
import { walletManager, walletRepository, withSignTxConfirmation } from '@lib/wallet-api-ui';
import { useAnalytics } from './hooks';
import { useDappContext, withDappContext } from '@src/features/dapp/context';
import { localDappService } from '../browser-view/features/dapp/components/DappList/localDappService';
import { isValidURL } from '@src/utils/is-valid-url';
import { CARDANO_COIN_SYMBOL } from './constants';

const { AVAILABLE_CHAINS, DEFAULT_SUBMIT_API } = config();

export const NamiView = withDappContext((): React.ReactElement => {
  const { setFiatCurrency, fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const { createWallet, getMnemonic, deleteWallet, switchNetwork, enableCustomNode, addAccount } = useWalletManager();
  const { walletUI, inMemoryWallet, walletInfo, currentChain, environmentName } = useWalletStore();
  const { theme, setTheme } = useTheme();
  const { handleAnalyticsChoice, isAnalyticsOptIn, sendEventToPostHog } = useAnalytics();
  const connectedDapps = useDappContext();
  const removeDapp = useCallback((origin: string) => localDappService.removeAuthorizedDapp(origin), []);
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();
  const cardanoCoin = useMemo(
    () => ({
      ...walletUI.cardanoCoin,
      symbol: CARDANO_COIN_SYMBOL[currentChain.networkId]
    }),
    [currentChain.networkId, walletUI.cardanoCoin]
  );
  const { txFee, isInitializing, initializeCollateralTx, submitCollateralTx } = useCollateral();

  const cardanoPrice = priceResult.cardano.price;
  const walletAddress = walletInfo?.addresses[0].address.toString();
  const { setAvatar } = useWalletAvatar();

  return (
    <OutsideHandlesProvider
      {...{
        collateralFee: txFee,
        isInitializingCollateral: isInitializing,
        initializeCollateralTx,
        submitCollateralTx,
        addAccount,
        removeDapp,
        connectedDapps,
        isAnalyticsOptIn,
        handleAnalyticsChoice,
        sendEventToPostHog,
        createWallet,
        getMnemonic,
        deleteWallet,
        fiatCurrency: fiatCurrency.code,
        setFiatCurrency,
        theme: theme.name,
        setTheme,
        walletAddress,
        inMemoryWallet,
        currentChain,
        cardanoPrice,
        withSignTxConfirmation,
        walletManager,
        walletRepository,
        switchNetwork,
        environmentName,
        availableChains: AVAILABLE_CHAINS,
        enableCustomNode,
        getCustomSubmitApiForNetwork,
        defaultSubmitApi: DEFAULT_SUBMIT_API,
        cardanoCoin,
        isValidURL,
        setAvatar
      }}
    >
      <Nami />
    </OutsideHandlesProvider>
  );
});
