/* eslint-disable max-statements */
/* eslint-disable unicorn/no-nested-ternary */
/* eslint-disable complexity */
import React, { useCallback, useEffect, useState } from 'react';
import isNumber from 'lodash/isNumber';
import { Wallet } from '@lace/cardano';
import { walletRoutePaths } from '@routes';
import { useRedirection, useBalances, useFetchCoinPrice, useDelegationDetails, useStakingRewards } from '@hooks';
import { useWalletStore } from '@stores';
import { networkInfoStatusSelector, stakePoolResultsSelector } from '@stores/selectors/staking-selectors';
import { walletBalanceTransformer } from '@src/api/transformers';
import { StakePoolDetails, StakingModals } from '../../stake-pool-details';
import { Sections } from '@views/browser/features/staking/types';
import { useStakePoolDetails } from '../../stake-pool-details/store';
import { useDelegationStore } from '../stores';
import { DelegationLayout } from './DelegationLayout';

import { TransitionAcknowledgmentDialog } from '@components/TransitionAcknowledgmentDialog';
import { useTranslation } from 'react-i18next';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { useObservable } from '@lace/common';

const STORAGE_MEMO_ENTRY_NAME = 'hideStakingHwDialog';
const MIN_CHARS_TO_SEARCH = 3;
const MAX_ITEMS_TO_SHOW = 3;
const PoolDetailsStepsWithExitBtn = new Set([
  Sections.CONFIRMATION,
  Sections.SIGN,
  Sections.FAIL_TX,
  Sections.SUCCESS_TX
]);
const PoolDetailsStepsWithExitConfirm = new Set([Sections.CONFIRMATION, Sections.SIGN]);
const PoolDetailsStepsWithBackBtn = new Set([Sections.DETAIL, Sections.CONFIRMATION, Sections.SIGN]);

export const DelegationContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    isInMemoryWallet,
    walletUI: { cardanoCoin },
    blockchainProvider
  } = useWalletStore();
  const [searchValue, setSearchValue] = useState<string | undefined>();
  const redirectToReceive = useRedirection(walletRoutePaths.receive);
  const dialogHiddenByUser = localStorage.getItem(STORAGE_MEMO_ENTRY_NAME) === 'true';
  const shouldShowAcknowledgmentDialog = !dialogHiddenByUser && !isInMemoryWallet;
  const [isTransitionAcknowledgmentDialogVisible, setIsTransitionAcknowledgmentDialogVisible] =
    useState(shouldShowAcknowledgmentDialog);
  const toggleisTransitionAcknowledgmentDialog = () =>
    setIsTransitionAcknowledgmentDialogVisible(!isTransitionAcknowledgmentDialogVisible);

  const isLoadingNetworkInfo = useWalletStore(networkInfoStatusSelector);
  const { stakePoolSearchResults, isSearching, fetchStakePools } = useWalletStore(stakePoolResultsSelector);

  const { setSelectedStakePool } = useDelegationStore();
  const { setStakeConfirmationVisible, setIsDrawerVisible, setSection } = useStakePoolDetails();

  const { inMemoryWallet, walletInfo } = useWalletStore();
  const { totalRewards, lastReward } = useStakingRewards();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);

  const { coinBalance: minAda } = walletBalanceTransformer(protocolParameters?.stakeKeyDeposit.toString());
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);
  const analytics = useAnalyticsContext();

  const delegationDetails = useDelegationDetails();
  const isStakeRegistered =
    rewardAccounts && rewardAccounts[0].credentialStatus === Wallet.Cardano.StakeCredentialStatus.Registered;
  const coinBalance = balance?.total?.coinBalance && Number(balance?.total?.coinBalance);
  const hasNoFunds = (coinBalance < Number(minAda) && !isStakeRegistered) || (coinBalance === 0 && isStakeRegistered);
  const isDelegating = !!(rewardAccounts && delegationDetails);
  const canDelegate = !isDelegating && isNumber(coinBalance) && !hasNoFunds;

  const handleSearch = (val: string) => setSearchValue(val ?? '');

  const onStakePoolSelect = (pool: Wallet.Cardano.StakePool) => {
    setSelectedStakePool(pool);
    setIsDrawerVisible(true);
  };

  const parseStakePools = () =>
    stakePoolSearchResults?.pageResults.map((pool) =>
      pool
        ? Wallet.util.stakePoolTransformer({
            stakePool: pool,
            delegatingPoolId: delegationDetails?.id?.toString(),
            cardanoCoin
          })
        : undefined
    );

  useEffect(() => {
    const hasPersistedHwStakepool = !!localStorage.getItem('TEMP_POOLID');
    const isHardwareWalletPopupTransition = !isInMemoryWallet && hasPersistedHwStakepool;
    // `hasPersistedHwStakepool` will get immidiately unset once the HW transition is over.
    if (isHardwareWalletPopupTransition) return;
    if (searchValue?.length !== 0 && searchValue?.length < MIN_CHARS_TO_SEARCH) return;
    fetchStakePools({ searchString: searchValue || '', limit: MAX_ITEMS_TO_SHOW });
  }, [searchValue, fetchStakePools, isInMemoryWallet, blockchainProvider]);

  const openDelagationConfirmation = useCallback(() => {
    setSection();
  }, [setSection]);

  const onStake = useCallback(() => {
    if (isDelegating) {
      setStakeConfirmationVisible(true);
      return;
    }

    openDelagationConfirmation();
    setIsDrawerVisible(true);
  }, [isDelegating, setStakeConfirmationVisible, openDelagationConfirmation, setIsDrawerVisible]);

  const sendAnalytics = () => {
    analytics.sendEventToPostHog(PostHogAction.StakingStakePoolClick);
  };

  return (
    <>
      <TransitionAcknowledgmentDialog
        visible={isTransitionAcknowledgmentDialogVisible}
        onClose={toggleisTransitionAcknowledgmentDialog}
        title={t('browserView.onboarding.stakingTransitionAcknowledgment.title')}
        description={t('browserView.onboarding.stakingTransitionAcknowledgment.description')}
        confirmationLabel={t('browserView.onboarding.stakingTransitionAcknowledgment.iUnderstand')}
        storageMemoEntryName="hideStakingHwDialog"
      />
      <DelegationLayout
        searchedPools={!searchValue?.length || searchValue?.length >= MIN_CHARS_TO_SEARCH ? parseStakePools() : []}
        coinBalance={coinBalance}
        searchValue={searchValue}
        handleSearchChange={handleSearch}
        handleAddFunds={redirectToReceive}
        currentStakePool={
          delegationDetails && Wallet.util.stakePoolTransformer({ stakePool: delegationDetails, cardanoCoin })
        }
        isLoading={isLoadingNetworkInfo}
        totalRewards={Wallet.util.lovelacesToAdaString(totalRewards.toString())}
        lastReward={Wallet.util.lovelacesToAdaString(lastReward.toString())}
        isSearching={isSearching}
        hasNoFunds={hasNoFunds}
        isDelegating={isDelegating}
        canDelegate={canDelegate}
        walletAddress={walletInfo?.addresses[0].address}
        fiat={priceResult?.cardano?.price}
        onStakePoolSelect={() => onStakePoolSelect(delegationDetails)}
        onStakePoolClick={(poolId: string) => {
          sendAnalytics();
          setSearchValue('');
          setSelectedStakePool(
            stakePoolSearchResults.pageResults.find((pool: Wallet.Cardano.StakePool) => pool?.id?.toString() === poolId)
          );
          setIsDrawerVisible(true);
        }}
        cardanoCoin={cardanoCoin}
      />
      <StakePoolDetails
        showCloseIcon={(section: Sections): boolean => PoolDetailsStepsWithExitBtn.has(section)}
        showBackIcon={(section: Sections): boolean => PoolDetailsStepsWithBackBtn.has(section)}
        showExitConfirmation={(section: Sections): boolean => PoolDetailsStepsWithExitConfirm.has(section)}
        canDelegate={!hasNoFunds}
        onStake={onStake}
        popupView
      />
      <StakingModals popupView />
    </>
  );
};
