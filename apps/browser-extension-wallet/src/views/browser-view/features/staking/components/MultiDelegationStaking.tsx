import { OutsideHandlesProvider, Staking } from '@lace/staking';
import React, { useCallback } from 'react';
import { useBackgroundServiceAPIContext, useCurrencyStore, useExternalLinkOpener, useTheme } from '@providers';
import { useBalances, useFetchCoinPrice, useLocalStorage, useStakingRewards, useWalletManager } from '@hooks';
import { stakePoolDetailsSelector, useDelegationStore } from '@src/features/delegation/stores';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useWalletStore } from '@stores';
import { compactNumberWithUnit } from '@utils/format-number';
import { useWalletActivities } from '@hooks/useWalletActivities';

const MULTIDELEGATION_FIRST_VISIT_LS_KEY = 'multidelegationFirstVisit';

export const MultiDelegationStaking = (): JSX.Element => {
  const { theme } = useTheme();
  const { setWalletPassword } = useBackgroundServiceAPIContext();
  const selectedStakePoolDetails = useDelegationStore(stakePoolDetailsSelector);
  const {
    delegationTxBuilder,
    setDelegationTxBuilder,
    delegationTxFee,
    setDelegationTxFee,
    setSelectedStakePool,
    selectedStakePool
  } = useDelegationStore();
  const openExternalLink = useExternalLinkOpener();
  const password = usePassword();
  const submittingState = useSubmitingState();
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);
  const stakingRewards = useStakingRewards();
  const {
    walletInfo,
    getKeyAgentType,
    inMemoryWallet,
    walletUI: { cardanoCoin },
    stakePoolSearchResults,
    stakePoolSearchResultsStatus,
    fetchStakePools,
    fetchNetworkInfo,
    networkInfo,
    blockchainProvider,
    currentChain
  } = useWalletStore((state) => ({
    getKeyAgentType: state.getKeyAgentType,
    inMemoryWallet: state.inMemoryWallet,
    walletUI: { cardanoCoin: state.walletUI.cardanoCoin },
    stakePoolSearchResults: state.stakePoolSearchResults,
    stakePoolSearchResultsStatus: state.stakePoolSearchResultsStatus,
    fetchStakePools: state.fetchStakePools,
    networkInfo: state.networkInfo,
    fetchNetworkInfo: state.fetchNetworkInfo,
    blockchainProvider: state.blockchainProvider,
    walletInfo: state.walletInfo,
    currentChain: state.currentChain
  }));
  const sendAnalytics = useCallback(() => {
    // TODO implement analytics for the new flow
    const analytics = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      sendEvent: () => {}
    };

    // @ts-expect-error TODO implement analytics
    analytics.sendEvent({
      action: 'AnalyticsEventActions.CLICK_EVENT',
      category: 'AnalyticsEventCategories.STAKING',
      name: 'AnalyticsEventNames.Staking.STAKING_MULTI_DELEGATION_BROWSER'
    });
  }, []);
  const { walletActivities } = useWalletActivities({ sendAnalytics });
  const { fiatCurrency } = useCurrencyStore();
  const { executeWithPassword } = useWalletManager();
  const [multidelegationFirstVisit, { updateLocalStorage: setMultidelegationFirstVisit }] = useLocalStorage(
    MULTIDELEGATION_FIRST_VISIT_LS_KEY,
    true
  );
  const walletAddress = walletInfo.addresses?.[0].address?.toString();

  return (
    <OutsideHandlesProvider
      {...{
        backgroundServiceAPIContextSetWalletPassword: setWalletPassword,
        balancesBalance: balance,
        delegationStoreSelectedStakePoolDetails: selectedStakePoolDetails,
        delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
        delegationStoreDelegationTxBuilder: delegationTxBuilder,
        delegationStoreSetSelectedStakePool: setSelectedStakePool,
        delegationStoreSetDelegationTxFee: setDelegationTxFee,
        delegationStoreDelegationTxFee: delegationTxFee,
        delegationStoreSelectedStakePool: selectedStakePool,
        fetchCoinPricePriceResult: priceResult,
        openExternalLink,
        password,
        stakingRewards,
        submittingState,
        walletStoreGetKeyAgentType: getKeyAgentType,
        walletStoreInMemoryWallet: inMemoryWallet,
        walletStoreWalletUICardanoCoin: cardanoCoin,
        currencyStoreFiatCurrency: fiatCurrency,
        walletManagerExecuteWithPassword: executeWithPassword,
        walletStoreStakePoolSearchResults: stakePoolSearchResults,
        walletStoreStakePoolSearchResultsStatus: stakePoolSearchResultsStatus,
        walletStoreFetchStakePools: fetchStakePools,
        walletStoreFetchNetworkInfo: fetchNetworkInfo,
        walletStoreNetworkInfo: networkInfo,
        walletStoreBlockchainProvider: blockchainProvider,
        walletStoreWalletActivities: walletActivities,
        // TODO: LW-7575 make compactNumber reusable and not pass it here.
        compactNumber: compactNumberWithUnit,
        multidelegationFirstVisit,
        triggerMultidelegationFirstVisit: () => setMultidelegationFirstVisit(false),
        walletAddress,
        currentChain
      }}
    >
      <Staking theme={theme.name} />
    </OutsideHandlesProvider>
  );
};
