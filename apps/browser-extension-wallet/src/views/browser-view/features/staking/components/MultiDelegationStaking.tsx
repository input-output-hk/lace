import { OutsideHandlesProvider, Staking } from '@lace/staking';
import React from 'react';
import { useBackgroundServiceAPIContext, useCurrencyStore, useExternalLinkOpener, useTheme } from '@providers';
import { useBalances, useFetchCoinPrice, useLocalStorage, useStakingRewards, useWalletManager } from '@hooks';
import { stakePoolDetailsSelector, useDelegationStore } from '@src/features/delegation/stores';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useWalletStore } from '@stores';
import { compactNumberWithUnit } from '@utils/format-number';
import { useObservable } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { walletBalanceTransformer } from '@src/api/transformers';

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
    blockchainProvider: state.blockchainProvider,
    walletInfo: state.walletInfo
  }));
  const { fiatCurrency } = useCurrencyStore();
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
  const { executeWithPassword } = useWalletManager();
  const [multidelegationFirstVisit, { updateLocalStorage: setMultidelegationFirstVisit }] = useLocalStorage(
    MULTIDELEGATION_FIRST_VISIT_LS_KEY,
    true
  );
  const { coinBalance: minAda } = walletBalanceTransformer(protocolParameters?.stakeKeyDeposit.toString());
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const walletAddress = walletInfo.addresses?.[0].address?.toString();
  const isStakeRegistered = rewardAccounts && rewardAccounts[0].keyStatus === Wallet.Cardano.StakeKeyStatus.Registered;
  const coinBalance = balance?.total?.coinBalance && Number(balance?.total?.coinBalance);
  const hasNoFunds = (coinBalance < Number(minAda) && !isStakeRegistered) || (coinBalance === 0 && isStakeRegistered);

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
        // TODO: LW-7575 make compactNumber reusable and not pass it here.
        compactNumber: compactNumberWithUnit,
        multidelegationFirstVisit,
        triggerMultidelegationFirstVisit: () => setMultidelegationFirstVisit(false),
        walletAddress,
        stakeRegistered: isStakeRegistered,
        coinBalance,
        noFunds: hasNoFunds
      }}
    >
      <Staking theme={theme.name} />
    </OutsideHandlesProvider>
  );
};
