import { OutsideHandlesProvider, Staking } from '@lace/staking';
import React, { useCallback, useEffect } from 'react';
import { useAnalyticsContext, useCurrencyStore, useExternalLinkOpener, useTheme } from '@providers';
import { useBalances, useFetchCoinPrice, useLocalStorage } from '@hooks';
import { useDelegationStore } from '@src/features/delegation/stores';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useWalletStore } from '@stores';
import { compactNumberWithUnit } from '@utils/format-number';
import { useWalletActivities } from '@hooks/useWalletActivities';
import {
  STAKING_BROWSER_PREFERENCES_LS_KEY,
  MULTIDELEGATION_FIRST_VISIT_LS_KEY,
  MULTIDELEGATION_FIRST_VISIT_SINCE_PORTFOLIO_PERSISTENCE_LS_KEY
} from '@utils/constants';
import { ActivityDetail } from '../../activity';
import { Drawer, DrawerNavigation } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { isMultidelegationSupportedByDevice } from '../helpers';

export const MultiDelegationStaking = (): JSX.Element => {
  const { theme } = useTheme();
  const { delegationTxBuilder, setDelegationTxBuilder, delegationTxFee, setDelegationTxFee } = useDelegationStore();
  const openExternalLink = useExternalLinkOpener();
  const password = usePassword();
  const submittingState = useSubmitingState();
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);
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
    activityDetail,
    resetActivityState
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
    activityDetail: state.activityDetail,
    resetActivityState: state.resetActivityState
  }));
  const { t } = useTranslation();
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
  const { walletActivities, walletActivitiesStatus } = useWalletActivities({ sendAnalytics });
  const { fiatCurrency } = useCurrencyStore();
  const [multidelegationFirstVisit, { updateLocalStorage: setMultidelegationFirstVisit }] = useLocalStorage(
    MULTIDELEGATION_FIRST_VISIT_LS_KEY,
    true
  );
  const [
    multidelegationFirstVisitSincePortfolioPersistence,
    { updateLocalStorage: setMultidelegationFirstVisitSincePortfolioPersistence }
  ] = useLocalStorage(MULTIDELEGATION_FIRST_VISIT_SINCE_PORTFOLIO_PERSISTENCE_LS_KEY, true);

  const [stakingBrowserPreferencesPersistence, { updateLocalStorage: setStakingBrowserPreferencesPersistence }] =
    useLocalStorage(STAKING_BROWSER_PREFERENCES_LS_KEY);

  const walletAddress = walletInfo.addresses?.[0].address?.toString();
  const analytics = useAnalyticsContext();

  // Reset current transaction details and close drawer if network (blockchainProvider) has changed
  useEffect(() => {
    resetActivityState();
  }, [resetActivityState, blockchainProvider]);

  return (
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
        multidelegationFirstVisitSincePortfolioPersistence,
        triggerMultidelegationFirstVisitSincePortfolioPersistence: () => {
          setMultidelegationFirstVisit(false);
          setMultidelegationFirstVisitSincePortfolioPersistence(false);
        },
        walletAddress,
        currentChain,
        isMultidelegationSupportedByDevice
      }}
    >
      <Staking currentChain={currentChain} theme={theme.name} />
      {/*
        Note: Mounting the browser-extension activity details drawer here is just a workaround.
        Ideally, the Drawer/Activity detail should be fully managed within the "Staking" component,
        which contains the respective "Activity" section, but that would require moving/refactoring
        large chunks of code, ATM tightly coupled with browser-extension state/logic,
        to a separate package (core perhaps?).
      */}
      <Drawer
        visible={!!activityDetail}
        onClose={resetActivityState}
        navigation={
          <DrawerNavigation
            title={t('transactions.detail.title')}
            onCloseIconClick={() => {
              resetActivityState();
            }}
          />
        }
      >
        {activityDetail && priceResult && <ActivityDetail price={priceResult} />}
      </Drawer>
    </OutsideHandlesProvider>
  );
};
