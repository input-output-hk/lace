import { OutsideHandlesProvider, StakingPopup } from '@lace/staking';
import React, { useCallback, useEffect } from 'react';
import {
  useAnalyticsContext,
  useBackgroundServiceAPIContext,
  useCurrencyStore,
  useExternalLinkOpener,
  useTheme
} from '@providers';
import { useBalances, useFetchCoinPrice, useLocalStorage, useStakingRewards, useWalletManager } from '@hooks';
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
  MULTIDELEGATION_FIRST_VISIT_SINCE_PORTFOLIO_PERSISTENCE_LS_KEY
} from '@utils/constants';

export const MultiDelegationStakingPopup = (): JSX.Element => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { setWalletPassword, handleOpenBrowser } = useBackgroundServiceAPIContext();
  const { delegationTxBuilder, setDelegationTxBuilder, delegationTxFee, setDelegationTxFee } = useDelegationStore();
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
    walletInfo,
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
      name: 'AnalyticsEventNames.Staking.STAKING_MULTI_DELEGATION_POPUP'
    });
  }, []);
  const { walletActivities, walletActivitiesStatus } = useWalletActivities({ sendAnalytics });
  const { fiatCurrency } = useCurrencyStore();
  const { executeWithPassword } = useWalletManager();
  const isLoadingNetworkInfo = useWalletStore(networkInfoStatusSelector);
  const [multidelegationFirstVisit, { updateLocalStorage: setMultidelegationFirstVisit }] = useLocalStorage(
    MULTIDELEGATION_FIRST_VISIT_LS_KEY,
    true
  );
  const [
    multidelegationFirstVisitSincePortfolioPersistence,
    { updateLocalStorage: setMultidelegationFirstVisitSincePortfolioPersistence }
  ] = useLocalStorage(MULTIDELEGATION_FIRST_VISIT_SINCE_PORTFOLIO_PERSISTENCE_LS_KEY, true);
  const walletAddress = walletInfo.addresses?.[0].address?.toString();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo, blockchainProvider]);

  return (
    <OutsideHandlesProvider
      {...{
        analytics,
        multidelegationFirstVisit,
        triggerMultidelegationFirstVisit: () => setMultidelegationFirstVisit(false),
        multidelegationFirstVisitSincePortfolioPersistence,
        triggerMultidelegationFirstVisitSincePortfolioPersistence: () => {
          setMultidelegationFirstVisit(false);
          setMultidelegationFirstVisitSincePortfolioPersistence(false);
        },
        backgroundServiceAPIContextSetWalletPassword: setWalletPassword,
        expandStakingView: () => handleOpenBrowser({ section: BrowserViewSections.STAKING }),
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
        walletStoreWalletActivitiesStatus: walletActivitiesStatus,
        // TODO: LW-7575 make compactNumber reusable and not pass it here.
        compactNumber: compactNumberWithUnit,
        walletAddress,
        currentChain
      }}
    >
      <ContentLayout
        title={<SectionTitle title={t('staking.sectionTitle')} classname={styles.sectionTilte} />}
        isLoading={isLoadingNetworkInfo}
      >
        <StakingPopup currentChain={currentChain} theme={theme.name} />
      </ContentLayout>
    </OutsideHandlesProvider>
  );
};
