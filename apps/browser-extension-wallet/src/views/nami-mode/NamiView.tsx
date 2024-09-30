/* eslint-disable max-statements */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Main as Nami, OutsideHandlesProvider } from '@lace/nami';
import { useWalletStore } from '@src/stores';
import { config } from '@src/config';
import { useBackgroundServiceAPIContext, useCurrencyStore, useExternalLinkOpener, useTheme } from '@providers';
import {
  useCustomSubmitApi,
  useWalletAvatar,
  useCollateral,
  useFetchCoinPrice,
  useWalletManager,
  useBuildDelegation,
  useBalances
} from '@hooks';
import { walletManager, withSignTxConfirmation } from '@lib/wallet-api-ui';
import { useAnalytics } from './hooks';
import { useDappContext, withDappContext } from '@src/features/dapp/context';
import { localDappService } from '../browser-view/features/dapp/components/DappList/localDappService';
import { isValidURL } from '@src/utils/is-valid-url';
import { CARDANO_COIN_SYMBOL } from './constants';
import { useDelegationTransaction } from '../browser-view/features/staking/hooks';
import { useSecrets } from '@lace/core';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useStakePoolDetails } from '@src/features/stake-pool-details/store';
import { getPoolInfos } from '@src/stores/slices';
import { Wallet } from '@lace/cardano';
import { walletBalanceTransformer } from '@src/api/transformers';
import { useObservable } from '@lace/common';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';
import { BackgroundStorage } from '@lib/scripts/types';

const { AVAILABLE_CHAINS, DEFAULT_SUBMIT_API } = config();

export const NamiView = withDappContext((): React.ReactElement => {
  const { setFiatCurrency, fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const [namiMigration, setNamiMigration] = useState<BackgroundStorage['namiMigration']>();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { createWallet, getMnemonic, deleteWallet, switchNetwork, enableCustomNode, addAccount, walletRepository } =
    useWalletManager();
  const {
    walletUI,
    inMemoryWallet,
    walletInfo,
    currentChain,
    environmentName,
    blockchainProvider: { stakePoolProvider }
  } = useWalletStore();
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
  const { delegationTxFee, setDelegationTxFee, setSelectedStakePool, setDelegationTxBuilder, delegationTxBuilder } =
    useDelegationStore();
  const { buildDelegation } = useBuildDelegation();
  const { signAndSubmitTransaction } = useDelegationTransaction();
  const { isBuildingTx, stakingError, setIsBuildingTx } = useStakePoolDetails();
  const passwordUtil = useSecrets();
  const getStakePoolInfo = useCallback(
    (id: Wallet.Cardano.PoolId) => getPoolInfos([id], stakePoolProvider),
    [stakePoolProvider]
  );

  const resetDelegationState = useCallback(() => {
    passwordUtil.clearSecrets();
    setDelegationTxFee();
    setDelegationTxBuilder();
    setIsBuildingTx(false);
  }, [passwordUtil, setDelegationTxBuilder, setDelegationTxFee, setIsBuildingTx]);

  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
  const isStakeRegistered =
    rewardAccounts && rewardAccounts[0].credentialStatus === Wallet.Cardano.StakeCredentialStatus.Registered;
  const { balance } = useBalances(priceResult?.cardano?.price);
  const { coinBalance: minAda } = walletBalanceTransformer(protocolParameters?.stakeKeyDeposit.toString());
  const coinBalance = balance?.total?.coinBalance && Number(balance?.total?.coinBalance);
  const hasNoFunds = (coinBalance < Number(minAda) && !isStakeRegistered) || (coinBalance === 0 && isStakeRegistered);
  const openExternalLink = useExternalLinkOpener();

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(console.error);
  }, []);

  const switchWalletMode = async () => {
    const mode = namiMigration?.mode === 'lace' ? 'nami' : 'lace';
    const migration: BackgroundStorage['namiMigration'] = {
      ...namiMigration,
      mode
    };

    setNamiMigration(migration);
    backgroundServices.handleChangeMode({ mode });
    await setBackgroundStorage({
      namiMigration: migration
    });
  };

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
        buildDelegation,
        signAndSubmitTransaction,
        passwordUtil,
        delegationTxFee: !!delegationTxBuilder && delegationTxFee,
        setSelectedStakePool,
        isBuildingTx,
        stakingError,
        getStakePoolInfo,
        resetDelegationState,
        hasNoFunds,
        setAvatar,
        switchWalletMode,
        openExternalLink
      }}
    >
      <Nami />
    </OutsideHandlesProvider>
  );
});
