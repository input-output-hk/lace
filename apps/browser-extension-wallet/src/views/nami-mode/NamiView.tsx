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
  useHandleResolver,
  useRedirection
} from '@hooks';
import { walletManager, withSignTxConfirmation } from '@lib/wallet-api-ui';
import { useAnalytics } from './hooks';
import { useDappContext, withDappContext } from '@src/features/dapp/context';
import { localDappService } from '../browser-view/features/dapp/components/DappList/localDappService';
import { isValidURL } from '@src/utils/is-valid-url';
import { BATCH, CARDANO_COIN_SYMBOL } from './constants';
import { useDelegationTransaction, useRewardAccountsData } from '../browser-view/features/staking/hooks';
import { useSecrets, useWrapWithTimeout } from '@lace/core';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useStakePoolDetails } from '@src/features/stake-pool-details/store';
import { getPoolInfos, getProviders } from '@src/stores/slices';
import { Wallet } from '@lace/cardano';
import { walletBalanceTransformer } from '@src/api/transformers';
import { logger, PostHogAction, useObservable } from '@lace/common';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';
import { certificateInspectorFactory } from '@src/features/dapp/components/confirm-transaction/utils';
import { useWalletState } from '@hooks/useWalletState';
import { isKeyHashAddress } from '@cardano-sdk/wallet';
import { BackgroundStorage } from '@lib/scripts/types';
import { getWalletAccountsQtyString } from '@src/utils/get-wallet-count-string';
import { useNetworkError } from '@hooks/useNetworkError';
import { walletRoutePaths } from '@routes';
import { StakingErrorType } from '@views/browser/features/staking/types';
import { useTxHistoryLoader } from '@hooks/useTxHistoryLoader';

const { AVAILABLE_CHAINS, DEFAULT_SUBMIT_API, GOV_TOOLS_URLS } = config();

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
    txBuilder: collateralTxBuilder,
    hasEnoughAda: hasEnoughAdaForCollateral
  } = useCollateral();

  const [isCompatibilityMode, setIsCompatibilityMode] = useState<boolean>();
  useEffect(() => {
    getBackgroundStorage()
      .then(({ dappInjectCompatibilityMode }) => setIsCompatibilityMode(dappInjectCompatibilityMode))
      .catch(logger.error);
  }, []);
  const handleCompatibilityModeChoice = async (newCompatMode: boolean) => {
    await setBackgroundStorage({ dappInjectCompatibilityMode: newCompatMode });
    setIsCompatibilityMode(newCompatMode);
  };

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
  const { isBuildingTx, stakingError, setIsBuildingTx, setStakingError } = useStakePoolDetails();
  const walletState = useWalletState();
  const secretsUtil = useSecrets();
  const openExternalLink = useExternalLinkOpener();
  const getStakePoolInfo = useCallback(
    (id: Wallet.Cardano.PoolId) => getPoolInfos([id], stakePoolProvider),
    [stakePoolProvider]
  );

  const resetDelegationState = useCallback(() => {
    secretsUtil.clearSecrets();
    setDelegationTxFee();
    setDelegationTxBuilder();
    setIsBuildingTx(false);
    setStakingError();
  }, [secretsUtil, setDelegationTxBuilder, setDelegationTxFee, setIsBuildingTx, setStakingError]);

  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const isStakeRegistered =
    rewardAccounts && rewardAccounts[0].credentialStatus === Wallet.Cardano.StakeCredentialStatus.Registered;
  const { balance } = useBalances(priceResult?.cardano?.price);
  const { coinBalance: minAda } = walletBalanceTransformer(walletState?.protocolParameters?.stakeKeyDeposit.toString());
  const coinBalance = balance?.total?.coinBalance && Number(balance?.total?.coinBalance);
  const hasNoFunds = (coinBalance < Number(minAda) && !isStakeRegistered) || (coinBalance === 0 && isStakeRegistered);

  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(logger.error);
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

  const { lockedStakeRewards } = useRewardAccountsData();
  const { inputResolver } = getProviders();

  const redirectToStaking = useRedirection(walletRoutePaths.earn);

  const txHistoryLoader = useTxHistoryLoader(BATCH);

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
        isCompatibilityMode,
        handleAnalyticsChoice,
        handleCompatibilityModeChoice,
        hasEnoughAdaForCollateral,
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
        secretsUtil,
        delegationTxFee: !!delegationTxBuilder && delegationTxFee,
        delegationStoreDelegationTxBuilder: delegationTxBuilder,
        collateralTxBuilder,
        setSelectedStakePool,
        isBuildingTx,
        stakingError: stakingError?.type,
        accountsWithLockedRewards: stakingError?.type === StakingErrorType.REWARDS_LOCKED && stakingError.data,
        getStakePoolInfo,
        resetDelegationState,
        hasNoFunds,
        setAvatar,
        switchWalletMode,
        openExternalLink,
        walletAddresses,
        transactions: walletState?.transactions,
        txHistoryLoader,
        eraSummaries: walletState?.eraSummaries,
        certificateInspectorFactory,
        connectHW,
        createHardwareWalletRevamped,
        saveHardwareWallet,
        setDeletingWallet,
        chainHistoryProvider,
        protocolParameters: walletState?.protocolParameters,
        assetInfo: walletState?.assetInfo,
        lockedStakeRewards,
        redirectToStaking,
        inputResolver,
        govToolsUrl: GOV_TOOLS_URLS[environmentName]
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
          handleResolver,
          useNetworkError,
          networkConnection: walletUI.networkConnection
        }}
      >
        <Nami />
      </CommonOutsideHandlesProvider>
    </OutsideHandlesProvider>
  );
});
