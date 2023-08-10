import { OutsideHandlesProvider, StakingPopup } from '@lace/staking';
import React, { useEffect } from 'react';
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
import { networkInfoStatusSelector, useWalletStore } from '@stores';
import { compactNumberWithUnit } from '@utils/format-number';
import { SectionTitle } from '@components/Layout/SectionTitle';
import styles from '@src/features/delegation/components/DelegationLayout.module.scss';
import { ContentLayout } from '@components/Layout';
import { useTranslation } from 'react-i18next';
import { BrowserViewSections } from '@lib/scripts/types';

export const MultiDelegationStakingPopup = (): JSX.Element => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { setWalletPassword, handleOpenBrowser } = useBackgroundServiceAPIContext();
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
    blockchainProvider
  } = useWalletStore((state) => ({
    getKeyAgentType: state.getKeyAgentType,
    inMemoryWallet: state.inMemoryWallet,
    walletUI: { cardanoCoin: state.walletUI.cardanoCoin },
    stakePoolSearchResults: state.stakePoolSearchResults,
    stakePoolSearchResultsStatus: state.stakePoolSearchResultsStatus,
    fetchStakePools: state.fetchStakePools,
    networkInfo: state.networkInfo,
    fetchNetworkInfo: state.fetchNetworkInfo,
    blockchainProvider: state.blockchainProvider
  }));
  const { fiatCurrency } = useCurrencyStore();
  const { executeWithPassword } = useWalletManager();
  const isLoadingNetworkInfo = useWalletStore(networkInfoStatusSelector);
  const MULTIDELEGATION_FIRST_VISIT_LS_KEY = 'multidelegationFirstVisit';
  const [multidelegationFirstVisit, { updateLocalStorage: setMultidelegationFirstVisit }] = useLocalStorage(
    MULTIDELEGATION_FIRST_VISIT_LS_KEY,
    true
  );

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo, blockchainProvider]);

  return (
    <OutsideHandlesProvider
      {...{
        multidelegationFirstVisit,
        triggerMultidelegationFirstVisit: () => setMultidelegationFirstVisit(false),
        backgroundServiceAPIContextSetWalletPassword: setWalletPassword,
        expandStakingView: () => handleOpenBrowser({ section: BrowserViewSections.STAKING }),
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
        compactNumber: compactNumberWithUnit
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
