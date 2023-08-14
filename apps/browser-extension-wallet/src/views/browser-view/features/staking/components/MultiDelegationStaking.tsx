import { OutsideHandlesProvider, Staking } from '@lace/staking';
import React, { useCallback, useEffect, useState } from 'react';
import flatMap from 'lodash/flatMap';
import { useBackgroundServiceAPIContext, useCurrencyStore, useExternalLinkOpener, useTheme } from '@providers';
import {
  useBalances,
  useDelegationDetails,
  useFetchCoinPrice,
  useLocalStorage,
  useStakingRewards,
  useWalletManager
} from '@hooks';
import { stakePoolDetailsSelector, useDelegationStore } from '@src/features/delegation/stores';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useWalletStore } from '@stores';
import { compactNumberWithUnit } from '@utils/format-number';
import { DelegationTransactionTypes, FetchWalletActivitiesReturn } from '@src/stores/slices';

const MULTIDELEGATION_FIRST_VISIT_LS_KEY = 'multidelegationFirstVisit';

export const MultiDelegationStaking = (): JSX.Element => {
  const { theme } = useTheme();
  const { setWalletPassword } = useBackgroundServiceAPIContext();
  const delegationDetails = useDelegationDetails();
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
    getKeyAgentType,
    inMemoryWallet,
    walletUI: { cardanoCoin },
    stakePoolSearchResults,
    stakePoolSearchResultsStatus,
    fetchStakePools,
    fetchNetworkInfo,
    networkInfo,
    blockchainProvider,
    getWalletActivitiesObservable,
    walletActivities
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
    getWalletActivitiesObservable: state.getWalletActivitiesObservable,
    walletActivities: state.walletActivities
  }));
  const [walletActivitiesObservable, setWalletActivitiesObservable] = useState<FetchWalletActivitiesReturn>();
  const { fiatCurrency } = useCurrencyStore();
  const { executeWithPassword } = useWalletManager();
  const [multidelegationFirstVisit, { updateLocalStorage: setMultidelegationFirstVisit }] = useLocalStorage(
    MULTIDELEGATION_FIRST_VISIT_LS_KEY,
    true
  );

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
      name: 'AnalyticsEventNames.Staking.STAKING_SIGN_CONFIRMATION_BROWSER'
    });
  }, []);

  useEffect(() => {
    if (!walletActivitiesObservable) return;
    const subscription = walletActivitiesObservable?.subscribe();
    // eslint-disable-next-line consistent-return
    return () => subscription.unsubscribe();
  }, [walletActivitiesObservable]);

  const fetchWalletActivities = useCallback(async () => {
    const result =
      fiatCurrency &&
      priceResult.cardano?.price &&
      (await getWalletActivitiesObservable({
        fiatCurrency,
        cardanoFiatPrice: priceResult.cardano?.price,
        sendAnalytics
      }));
    setWalletActivitiesObservable(result);
  }, [fiatCurrency, getWalletActivitiesObservable, sendAnalytics, priceResult]);

  useEffect(() => {
    fetchWalletActivities();
  }, [fetchWalletActivities]);

  const hasPendingDelegationTransaction = flatMap(walletActivities, ({ items }) => items).some(
    ({ type, status }) => DelegationTransactionTypes.has(type) && status === 'sending'
  );

  return (
    <OutsideHandlesProvider
      {...{
        backgroundServiceAPIContextSetWalletPassword: setWalletPassword,
        balancesBalance: balance,
        delegationDetails,
        delegationStoreSelectedStakePoolDetails: selectedStakePoolDetails,
        delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
        delegationStoreDelegationTxBuilder: delegationTxBuilder,
        delegationStoreSetSelectedStakePool: setSelectedStakePool,
        delegationStoreSetDelegationTxFee: setDelegationTxFee,
        delegationStoreDelegationTxFee: delegationTxFee,
        delegationStoreSelectedStakePool: selectedStakePool,
        fetchCoinPricePriceResult: priceResult,
        hasPendingDelegationTransaction,
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
        // TODO: LW-7575 make compactNumber reusable and not pass it here.
        compactNumber: compactNumberWithUnit,
        multidelegationFirstVisit,
        triggerMultidelegationFirstVisit: () => setMultidelegationFirstVisit(false)
      }}
    >
      <Staking theme={theme.name} />
    </OutsideHandlesProvider>
  );
};
