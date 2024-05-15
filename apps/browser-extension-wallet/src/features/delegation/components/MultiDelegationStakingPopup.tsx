import { DEFAULT_STAKING_BROWSER_PREFERENCES, OutsideHandlesProvider, StakingPopup } from '@lace/staking';
import React, { useCallback, useEffect } from 'react';
import {
  useAnalyticsContext,
  useBackgroundServiceAPIContext,
  useCurrencyStore,
  useExternalLinkOpener,
  useTheme
} from '@providers';
import { useBalances, useCustomSubmitApi, useFetchCoinPrice, useLocalStorage, useStakingRewards } from '@hooks';
import { useDelegationStore } from '@src/features/delegation/stores';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { networkInfoStatusSelector, useWalletStore } from '@stores';
import { compactNumberWithUnit } from '@utils/format-number';
import { SectionTitle } from '@components/Layout/SectionTitle';
import styles from '@src/features/delegation/components/DelegationLayout.module.scss';
import { ContentLayout } from '@components/Layout';
import { useTranslation } from 'react-i18next';
import { BrowserViewSections } from '@lib/scripts/types';
import { useWalletActivities } from '@hooks/useWalletActivities';
import {
  MULTIDELEGATION_FIRST_VISIT_LS_KEY,
  MULTIDELEGATION_FIRST_VISIT_SINCE_PORTFOLIO_PERSISTENCE_LS_KEY,
  STAKING_BROWSER_PREFERENCES_LS_KEY
} from '@utils/constants';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { isMultidelegationSupportedByDevice } from '@views/browser/features/staking';

export const MultiDelegationStakingPopup = (): JSX.Element => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { handleOpenBrowser } = useBackgroundServiceAPIContext();
  const { delegationTxBuilder, setDelegationTxBuilder, delegationTxFee, setDelegationTxFee } = useDelegationStore();
  const openExternalLink = useExternalLinkOpener();
  const password = usePassword();
  const submittingState = useSubmitingState();
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);
  const stakingRewards = useStakingRewards();
  const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();
  const {
    walletType,
    inMemoryWallet,
    walletUI: { cardanoCoin },
    stakePoolSearchResults,
    stakePoolSearchResultsStatus,
    fetchStakePools,
    fetchNetworkInfo,
    networkInfo,
    blockchainProvider,
    walletInfo,
    currentChain,
    environmentName
  } = useWalletStore((state) => ({
    walletType: state.walletType,
    inMemoryWallet: state.inMemoryWallet,
    walletUI: { cardanoCoin: state.walletUI.cardanoCoin },
    stakePoolSearchResults: state.stakePoolSearchResults,
    stakePoolSearchResultsStatus: state.stakePoolSearchResultsStatus,
    fetchStakePools: state.fetchStakePools,
    networkInfo: state.networkInfo,
    fetchNetworkInfo: state.fetchNetworkInfo,
    blockchainProvider: state.blockchainProvider,
    walletInfo: state.walletInfo,
    currentChain: state.currentChain,
    environmentName: state.environmentName
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
      name: 'AnalyticsEventNames.Staking.STAKING_MULTI_DELEGATION_POPUP'
    });
  }, []);
  const { walletActivities, walletActivitiesStatus } = useWalletActivities({ sendAnalytics });
  const { fiatCurrency } = useCurrencyStore();
  const isLoadingNetworkInfo = useWalletStore(networkInfoStatusSelector);
  const [multidelegationFirstVisit, { updateLocalStorage: setMultidelegationFirstVisit }] = useLocalStorage(
    MULTIDELEGATION_FIRST_VISIT_LS_KEY,
    true
  );
  const [
    multidelegationFirstVisitSincePortfolioPersistence,
    { updateLocalStorage: setMultidelegationFirstVisitSincePortfolioPersistence }
  ] = useLocalStorage(MULTIDELEGATION_FIRST_VISIT_SINCE_PORTFOLIO_PERSISTENCE_LS_KEY, true);

  const [stakingBrowserPreferencesPersistence, { updateLocalStorage: setStakingBrowserPreferencesPersistence }] =
    useLocalStorage(STAKING_BROWSER_PREFERENCES_LS_KEY, DEFAULT_STAKING_BROWSER_PREFERENCES);

  const walletAddress = walletInfo.addresses?.[0].address?.toString();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo, blockchainProvider]);

  return (
    <OutsideHandlesProvider
      {...{
        analytics,
        stakingBrowserPreferencesPersistence,
        setStakingBrowserPreferencesPersistence,
        multidelegationFirstVisit,
        triggerMultidelegationFirstVisit: () => setMultidelegationFirstVisit(false),
        multidelegationFirstVisitSincePortfolioPersistence,
        triggerMultidelegationFirstVisitSincePortfolioPersistence: () => {
          setMultidelegationFirstVisit(false);
          setMultidelegationFirstVisitSincePortfolioPersistence(false);
        },
        expandStakingView: (urlSearchParams?: string) =>
          handleOpenBrowser({ section: BrowserViewSections.STAKING, urlSearchParams }),
        balancesBalance: balance,
        delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
        delegationStoreDelegationTxBuilder: delegationTxBuilder,
        delegationStoreSetDelegationTxFee: setDelegationTxFee,
        delegationStoreDelegationTxFee: delegationTxFee,
        fetchCoinPricePriceResult: priceResult,
        openExternalLink,
        password,
        stakingRewards,
        submittingState,
        walletManagerExecuteWithPassword: withSignTxConfirmation,
        walletStoreWalletType: walletType,
        walletStoreInMemoryWallet: inMemoryWallet,
        walletStoreWalletUICardanoCoin: cardanoCoin,
        currencyStoreFiatCurrency: fiatCurrency,
        walletStoreStakePoolSearchResults: stakePoolSearchResults,
        walletStoreStakePoolSearchResultsStatus: stakePoolSearchResultsStatus,
        walletStoreFetchStakePools: fetchStakePools,
        walletStoreFetchNetworkInfo: fetchNetworkInfo,
        walletStoreNetworkInfo: networkInfo,
        walletStoreBlockchainProvider: blockchainProvider,
        walletStoreWalletActivities: walletActivities,
        walletStoreWalletActivitiesStatus: walletActivitiesStatus,
        // TODO: LW-7575 make compactNumber reusable and not pass it here.
        compactNumber: compactNumberWithUnit,
        walletAddress,
        currentChain,
        isMultidelegationSupportedByDevice,
        isCustomSubmitApiEnabled: getCustomSubmitApiForNetwork(environmentName).status
      }}
    >
      <ContentLayout
        title={<SectionTitle title={t('staking.sectionTitle')} classname={styles.sectionTilte} />}
        isLoading={isLoadingNetworkInfo}
      >
        <StakingPopup theme={theme.name} />
      </ContentLayout>
    </OutsideHandlesProvider>
  );
};
