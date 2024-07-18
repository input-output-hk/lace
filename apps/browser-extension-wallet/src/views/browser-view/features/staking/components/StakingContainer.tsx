/* eslint-disable @typescript-eslint/no-var-requires */
import { Layout } from '@src/views/browser-view/components';
import React, { useCallback } from 'react';
import { StakingSkeleton } from './StakingSkeleton';
import { useMultiDelegationEnabled } from '@hooks/useMultiDelegationEnabled';
import { MultiDelegationStaking } from './MultiDelegationStaking';
import { Staking } from './Staking';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { compactNumberWithUnit } from '@utils/format-number';
import { isMultidelegationSupportedByDevice } from '@views/browser/features/staking';
import { useWalletStore } from '@stores';
import { useAnalyticsContext, useCurrencyStore, useExternalLinkOpener } from '@providers';
import { DEFAULT_STAKING_BROWSER_PREFERENCES, OutsideHandlesProvider } from '@lace/staking';
import { useBalances, useCustomSubmitApi, useFetchCoinPrice, useLocalStorage, useWalletManager } from '@hooks';
import {
  MULTIDELEGATION_DAPP_COMPATIBILITY_LS_KEY,
  MULTIDELEGATION_FIRST_VISIT_LS_KEY,
  MULTIDELEGATION_FIRST_VISIT_SINCE_PORTFOLIO_PERSISTENCE_LS_KEY,
  STAKING_BROWSER_PREFERENCES_LS_KEY
} from '@utils/constants';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletActivities } from '@hooks/useWalletActivities';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { useSharedWalletData } from '@hooks/useSharedWalletData';
import { AnyWallet, WalletType } from '@cardano-sdk/web-extension';
import { stakingScriptKeyPath } from '@lace/core';

export const StakingContainer = (): React.ReactElement => {
  // TODO: LW-7575 Remove old staking in post-MVP of multi delegation staking.
  const multiDelegationEnabled = useMultiDelegationEnabled();
  const analytics = useAnalyticsContext();
  const [stakingBrowserPreferencesPersistence, { updateLocalStorage: setStakingBrowserPreferencesPersistence }] =
    useLocalStorage(STAKING_BROWSER_PREFERENCES_LS_KEY, DEFAULT_STAKING_BROWSER_PREFERENCES);
  const [multidelegationFirstVisit, { updateLocalStorage: setMultidelegationFirstVisit }] = useLocalStorage(
    MULTIDELEGATION_FIRST_VISIT_LS_KEY,
    true
  );
  const [multidelegationDAppCompatibility, { updateLocalStorage: setMultidelegationDAppCompatibility }] =
    useLocalStorage(MULTIDELEGATION_DAPP_COMPATIBILITY_LS_KEY, true);
  const [
    multidelegationFirstVisitSincePortfolioPersistence,
    { updateLocalStorage: setMultidelegationFirstVisitSincePortfolioPersistence }
  ] = useLocalStorage(MULTIDELEGATION_FIRST_VISIT_SINCE_PORTFOLIO_PERSISTENCE_LS_KEY, true);
  const sendAnalytics = useCallback(() => {
    // TODO implement analytics for the new flow
    const an = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      sendEvent: () => {}
    };

    // @ts-expect-error TODO implement analytics
    an.sendEvent({
      action: 'AnalyticsEventActions.CLICK_EVENT',
      category: 'AnalyticsEventCategories.STAKING',
      name: 'AnalyticsEventNames.Staking.STAKING_MULTI_DELEGATION_BROWSER'
    });
  }, []);
  const openExternalLink = useExternalLinkOpener();
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);
  const { delegationTxBuilder, setDelegationTxBuilder, delegationTxFee, setDelegationTxFee } = useDelegationStore();
  const { fiatCurrency } = useCurrencyStore();
  const { walletActivities, walletActivitiesStatus } = useWalletActivities({ sendAnalytics });
  const password = usePassword();
  const submittingState = useSubmitingState();
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();

  const {
    walletInfo,
    walletType,
    inMemoryWallet,
    walletUI: { cardanoCoin },
    stakePoolSearchResults,
    stakePoolSearchResultsStatus,
    fetchStakePools,
    resetStakePools,
    fetchNetworkInfo,
    networkInfo,
    blockchainProvider,
    currentChain,
    environmentName,
    isSharedWallet
  } = useWalletStore((state) => ({
    walletType: state.walletType,
    inMemoryWallet: state.inMemoryWallet,
    walletUI: { cardanoCoin: state.walletUI.cardanoCoin },
    stakePoolSearchResults: state.stakePoolSearchResults,
    stakePoolSearchResultsStatus: state.stakePoolSearchResultsStatus,
    fetchStakePools: state.fetchStakePools,
    resetStakePools: state.resetStakePools,
    networkInfo: state.networkInfo,
    fetchNetworkInfo: state.fetchNetworkInfo,
    blockchainProvider: state.blockchainProvider,
    walletInfo: state.walletInfo,
    currentChain: state.currentChain,
    environmentName: state.environmentName,
    isSharedWallet: state.isSharedWallet
  }));
  const walletAddress = walletInfo.addresses?.[0].address?.toString();
  const walletName = walletInfo.name;

  const { walletManager, walletRepository } = useWalletManager();

  const activeWalletId = useObservable(walletManager.activeWalletId$);
  const wallets = useObservable(walletRepository.wallets$);
  const activeWallet = wallets?.find(
    (w: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) => w.walletId === activeWalletId?.walletId
  );

  const { signPolicy, sharedWalletKey } = useSharedWalletData({
    activeWallet,
    isSharedWallet,
    script: activeWallet?.type === WalletType.Script ? activeWallet.stakingScript : undefined,
    derivationPath: stakingScriptKeyPath
  });

  return (
    <Layout>
      <OutsideHandlesProvider
        {...{
          analytics,
          stakingBrowserPreferencesPersistence,
          setStakingBrowserPreferencesPersistence,
          balancesBalance: balance,
          delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
          delegationStoreDelegationTxBuilder: delegationTxBuilder,
          delegationStoreSetDelegationTxFee: setDelegationTxFee,
          delegationStoreDelegationTxFee: delegationTxFee,
          fetchCoinPricePriceResult: priceResult,
          openExternalLink,
          walletManagerExecuteWithPassword: withSignTxConfirmation,
          password,
          submittingState,
          walletStoreWalletType: walletType,
          walletStoreInMemoryWallet: inMemoryWallet,
          walletStoreWalletUICardanoCoin: cardanoCoin,
          currencyStoreFiatCurrency: fiatCurrency,
          walletStoreStakePoolSearchResults: stakePoolSearchResults,
          walletStoreStakePoolSearchResultsStatus: stakePoolSearchResultsStatus,
          walletStoreFetchStakePools: fetchStakePools,
          walletStoreResetStakePools: resetStakePools,
          walletStoreFetchNetworkInfo: fetchNetworkInfo,
          walletStoreNetworkInfo: networkInfo,
          walletStoreBlockchainProvider: blockchainProvider,
          walletStoreWalletActivities: walletActivities,
          walletStoreWalletActivitiesStatus: walletActivitiesStatus,
          // TODO: LW-7575 make compactNumber reusable and not pass it here.
          compactNumber: compactNumberWithUnit,
          multidelegationFirstVisit,
          triggerMultidelegationFirstVisit: () => setMultidelegationFirstVisit(false),
          multidelegationDAppCompatibility,
          triggerMultidelegationDAppCompatibility: () => setMultidelegationDAppCompatibility(false),
          multidelegationFirstVisitSincePortfolioPersistence,
          triggerMultidelegationFirstVisitSincePortfolioPersistence: () => {
            setMultidelegationFirstVisit(false);
            setMultidelegationFirstVisitSincePortfolioPersistence(false);
          },
          walletAddress,
          walletName,
          currentChain,
          isMultidelegationSupportedByDevice,
          isCustomSubmitApiEnabled: getCustomSubmitApiForNetwork(environmentName).status,
          isSharedWallet,
          signPolicy,
          sharedWalletKey,
          deriveSharedWalletExtendedPublicKeyHash: Wallet.util.deriveEd25519KeyHashFromBip32PublicKey
        }}
      >
        <StakingSkeleton multiDelegationEnabled={multiDelegationEnabled}>
          {multiDelegationEnabled ? <MultiDelegationStaking /> : <Staking />}
        </StakingSkeleton>
      </OutsideHandlesProvider>
    </Layout>
  );
};
