/* eslint-disable max-statements */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CommonOutsideHandlesProvider, Main as Nami, OutsideHandlesProvider } from '@lace/nami';
import { useWalletStore } from '@src/stores';
import { config } from '@src/config';
import {
  useBackgroundServiceAPIContext,
  useCurrencyStore,
  useExternalLinkOpener,
  useTheme,
  useAnalyticsContext
} from '@providers';
import {
  useCustomSubmitApi,
  useWalletAvatar,
  useCollateral,
  useFetchCoinPrice,
  useWalletManager,
  useBuildDelegation,
  useBalances,
  useHandleResolver
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
import { PostHogAction, useObservable } from '@lace/common';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';
import { useWrapWithTimeout } from '../browser-view/features/multi-wallet/hardware-wallet/useWrapWithTimeout';
import { certificateInspectorFactory } from '@src/features/dapp/components/confirm-transaction/utils';
import { useWalletState } from '@hooks/useWalletState';
import { isKeyHashAddress } from '@cardano-sdk/wallet';
import { BackgroundStorage } from '@lib/scripts/types';
import { getWalletAccountsQtyString } from '@src/utils/get-wallet-count-string';

const { AVAILABLE_CHAINS, DEFAULT_SUBMIT_API } = config();

export const NamiView = withDappContext((): React.ReactElement => {
  const { setFiatCurrency, fiatCurrency } = useCurrencyStore();
  const { priceResult } = useFetchCoinPrice();
  const [namiMigration, setNamiMigration] = useState<BackgroundStorage['namiMigration']>();
  const backgroundServices = useBackgroundServiceAPIContext();
  const analytics = useAnalyticsContext();
  const {
    createWalletFromPrivateKey,
    getMnemonic,
    deleteWallet,
    switchNetwork,
    enableCustomNode,
    addAccount,
    walletRepository,
    connectHardwareWalletRevamped,
    createHardwareWalletRevamped,
    saveHardwareWallet
  } = useWalletManager();
  const {
    walletUI,
    inMemoryWallet,
    walletType,
    walletInfo,
    currentChain,
    environmentName,
    blockchainProvider: { stakePoolProvider, chainHistoryProvider },
    setDeletingWallet
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
  const {
    txFee,
    isInitializing,
    initializeCollateralTx,
    submitCollateralTx,
    txBuilder: collateralTxBuilder
  } = useCollateral();

  const handleResolver = useHandleResolver();

  const cardanoPrice = priceResult.cardano.price;
  const walletAddresses = walletInfo?.addresses
    .filter((address) => isKeyHashAddress(address))
    .map(({ address }) => address);
  const { setAvatar } = useWalletAvatar();
  const { delegationTxFee, setDelegationTxFee, setSelectedStakePool, setDelegationTxBuilder, delegationTxBuilder } =
    useDelegationStore();
  const { buildDelegation } = useBuildDelegation();
  const { signAndSubmitTransaction } = useDelegationTransaction();
  const { isBuildingTx, stakingError, setIsBuildingTx } = useStakePoolDetails();
  const walletState = useWalletState();
  const passwordUtil = useSecrets();
  const openExternalLink = useExternalLinkOpener();
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

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(console.error);
  }, []);

  const switchWalletMode = useCallback(async () => {
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
  }, [backgroundServices, namiMigration]);

  const getTxInputsValueAndAddress = useCallback(
    async (inputs: Wallet.Cardano.TxIn[] | Wallet.Cardano.HydratedTxIn[]) =>
      await Wallet.getTxInputsValueAndAddress(inputs, chainHistoryProvider, inMemoryWallet),
    [chainHistoryProvider, inMemoryWallet]
  );

  const sortedTx = useMemo(
    () =>
      walletState
        ? [
            ...walletState.transactions.outgoing.inFlight,
            ...walletState.transactions.history.sort((tx1, tx2) => tx2.blockHeader.slot - tx1.blockHeader.slot)
          ]
        : undefined,
    [walletState]
  );

  const openHWFlow = useCallback(
    (path: string) => {
      backgroundServices.handleOpenNamiBrowser({ path });
    },
    [backgroundServices]
  );
  const connectHW = useWrapWithTimeout(connectHardwareWalletRevamped);

  const removeWallet = useCallback(async () => {
    setDeletingWallet(true);
    await analytics.sendEventToPostHog(PostHogAction.SettingsHoldUpRemoveWalletClick, {
      // eslint-disable-next-line camelcase
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletRepository) }
    });
    await deleteWallet();
    setDeletingWallet(false);
  }, [analytics, deleteWallet, setDeletingWallet, walletRepository]);

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
        createWallet: createWalletFromPrivateKey,
        getMnemonic,
        deleteWallet,
        removeWallet,
        fiatCurrency: fiatCurrency.code,
        setFiatCurrency,
        theme: theme.name,
        setTheme,
        currentChain,
        cardanoPrice,
        walletManager,
        walletRepository,
        switchNetwork,
        environmentName,
        availableChains: AVAILABLE_CHAINS,
        enableCustomNode,
        getCustomSubmitApiForNetwork,
        defaultSubmitApi: DEFAULT_SUBMIT_API,
        isValidURL,
        buildDelegation,
        signAndSubmitTransaction,
        passwordUtil,
        delegationTxFee: !!delegationTxBuilder && delegationTxFee,
        delegationStoreDelegationTxBuilder: delegationTxBuilder,
        collateralTxBuilder,
        setSelectedStakePool,
        isBuildingTx,
        stakingError,
        getStakePoolInfo,
        resetDelegationState,
        hasNoFunds,
        setAvatar,
        switchWalletMode,
        openExternalLink,
        walletAddresses,
        transactions: sortedTx,
        eraSummaries: walletState?.eraSummaries,
        getTxInputsValueAndAddress,
        certificateInspectorFactory,
        connectHW,
        createHardwareWalletRevamped,
        saveHardwareWallet,
        setDeletingWallet
      }}
    >
      <CommonOutsideHandlesProvider
        {...{
          cardanoCoin,
          walletType,
          openHWFlow,
          inMemoryWallet,
          withSignTxConfirmation,
          sendEventToPostHog,
          handleResolver
        }}
      >
        <Nami />
      </CommonOutsideHandlesProvider>
    </OutsideHandlesProvider>
  );
});
