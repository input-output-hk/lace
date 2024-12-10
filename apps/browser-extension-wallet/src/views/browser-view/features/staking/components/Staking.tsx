/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect } from 'react';
import isNumber from 'lodash/isNumber';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { RegisterAsDRepBanner } from '@lace/staking';
import styles from './Staking.modules.scss';
import { stakePoolResultsSelector, stakingInfoSelector } from '@stores/selectors/staking-selectors';
import { StakeFundsBanner } from './StakeFundsBanner';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { useWalletStore } from '@stores';
import { useBalances, useDelegationDetails, useFetchCoinPrice, useStakingRewards } from '@src/hooks';
import { useDelegationStore } from '@src/features/delegation/stores';
import { walletBalanceTransformer } from '@src/api/transformers';
import { StakePoolDetails } from './StakePoolDetails';
import { Sections } from '../types';
import { StakePoolsTable } from './StakePoolsTable';
import { StakingInfo } from './StakingInfo';
import { useStakePoolDetails } from '../store';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { LACE_APP_ID } from '@src/utils/constants';
import { useObservable } from '@lace/common';
import { fetchPoolsInfo } from '../utils';
import { Box } from '@input-output-hk/lace-ui-toolkit';
import { useExternalLinkOpener } from '@providers';
import { config } from '@src/config';
import { useRewardAccountsData } from '../hooks';

const stepsWithExitConfirmation = new Set([Sections.CONFIRMATION, Sections.SIGN, Sections.FAIL_TX]);

const stepsWithBackBtn = new Set([Sections.CONFIRMATION, Sections.SIGN]);

export const Staking = (): React.ReactElement => {
  const { t } = useTranslation();
  const { setStakeConfirmationVisible, setIsDrawerVisible, setSection } = useStakePoolDetails();
  const { networkInfo, fetchNetworkInfo } = useWalletStore(stakingInfoSelector);
  const { setSelectedStakePool } = useDelegationStore();
  const {
    isInMemoryWallet,
    blockchainProvider,
    walletInfo,
    inMemoryWallet,
    walletUI: { cardanoCoin },
    environmentName
  } = useWalletStore();
  const { fetchStakePools } = useWalletStore(stakePoolResultsSelector);
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
  const delegationDetails = useDelegationDetails();
  const { totalRewards, lastReward } = useStakingRewards();
  const openExternalLink = useExternalLinkOpener();

  const { coinBalance: minAda } = walletBalanceTransformer(protocolParameters?.stakeKeyDeposit.toString());

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo, blockchainProvider]);

  const coinBalance = balance?.total?.coinBalance && Number(balance?.total?.coinBalance);
  const isStakeRegistered =
    rewardAccounts && rewardAccounts[0].credentialStatus === Wallet.Cardano.StakeCredentialStatus.Registered;
  const isDelegating = rewardAccounts && delegationDetails;
  const hasNoFunds = (coinBalance < Number(minAda) && !isStakeRegistered) || (coinBalance === 0 && isStakeRegistered);
  const canDelegate = !isDelegating && isNumber(coinBalance) && !hasNoFunds;

  const { areAllRegisteredStakeKeysWithoutVotingDelegation, poolIdToRewardAccountsMap } = useRewardAccountsData();
  const showRegisterAsDRepBanner = !hasNoFunds && areAllRegisteredStakeKeysWithoutVotingDelegation;
  const { GOV_TOOLS_URLS } = config();

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

  const onStakePoolSelect = () => {
    setSelectedStakePool(delegationDetails);
    setIsDrawerVisible(true);
  };

  useEffect(() => {
    const fetchSelectedStakePool = async () => {
      if (isInMemoryWallet || !networkInfo) return;
      const stakePoolId = localStorage.getItem('TEMP_POOLID');
      if (!stakePoolId) return;
      const searchString = String(stakePoolId);
      const pageResults = await fetchPoolsInfo({
        searchString,
        stakePoolProvider: blockchainProvider.stakePoolProvider
      });
      const foundStakePool = pageResults.find((pool: Wallet.Cardano.StakePool) => pool?.id?.toString() === stakePoolId);
      if (!foundStakePool) return;
      setSelectedStakePool(foundStakePool);
      setIsDrawerVisible(true);
      fetchStakePools({ searchString: '' });
    };
    fetchSelectedStakePool();
  }, [
    blockchainProvider.stakePoolProvider,
    fetchStakePools,
    isInMemoryWallet,
    networkInfo,
    setIsDrawerVisible,
    setSelectedStakePool
  ]);

  return (
    <>
      {showRegisterAsDRepBanner && (
        <Box mb="$56">
          <RegisterAsDRepBanner openExternalLink={openExternalLink} govToolUrl={GOV_TOOLS_URLS[environmentName]} />
        </Box>
      )}
      <div>
        <SectionTitle
          title={t('browserView.staking.title')}
          // eslint-disable-next-line max-len
          // TODO: removed until we have multidelegation see https://github.com/input-output-hk/lace/pull/1166#issuecomment-1247989647
          // sideText={`(${isDelegating ? 1 : 0})`}
        />
        {hasNoFunds && (
          <FundWalletBanner
            title={t('browserView.assets.welcome')}
            subtitle={t('browserView.staking.fundWalletBanner.subtitle')}
            prompt={t('browserView.fundWalletBanner.prompt')}
            walletAddress={walletInfo.addresses[0].address.toString()}
          />
        )}
        {canDelegate && <StakeFundsBanner balance={coinBalance} />}
        {isDelegating && (
          <div className={styles.flexRow}>
            <StakingInfo
              {...{
                ...Wallet.util.stakePoolTransformer({ stakePool: delegationDetails, cardanoCoin }),
                rewardAccount: poolIdToRewardAccountsMap.get(delegationDetails.id)?.[0],
                coinBalance,
                fiat: priceResult?.cardano?.price,
                totalRewards: Wallet.util.lovelacesToAdaString(totalRewards.toString()),
                lastReward: Wallet.util.lovelacesToAdaString(lastReward.toString()),
                cardanoCoin
              }}
              onStakePoolSelect={onStakePoolSelect}
            />
          </div>
        )}
        <StakePoolsTable scrollableTargetId={LACE_APP_ID} />
        <StakePoolDetails
          showCloseIcon
          showBackIcon={(section: Sections): boolean => stepsWithBackBtn.has(section)}
          showExitConfirmation={(section: Sections): boolean => stepsWithExitConfirmation.has(section)}
          canDelegate={!hasNoFunds}
          onStake={onStake}
        />
      </div>
    </>
  );
};
