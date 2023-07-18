import { OutsideHandlesProvider, Staking } from '@lace/staking';
import React from 'react';
import { useBackgroundServiceAPIContext, useCurrencyStore, useExternalLinkOpener, useTheme } from '@providers';
// Disabling import/no-unresolved as it is not aware of the "exports" entry
// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import '@lace/staking/index.css';
import { useBalances, useDelegationDetails, useFetchCoinPrice, useStakingRewards, useWalletManager } from '@hooks';
import { stakePoolDetailsSelector, useDelegationStore } from '@src/features/delegation/stores';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useWalletStore } from '@stores';

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
        walletStoreBlockchainProvider: blockchainProvider
      }}
    >
      <Staking theme={theme.name} />
    </OutsideHandlesProvider>
  );
};
