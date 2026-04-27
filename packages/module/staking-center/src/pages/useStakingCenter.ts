import {
  ADA_DECIMALS,
  LOVELACE_TOKEN_ID,
  DEFAULT_DECIMALS,
  convertLovelacesToAda,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { FeatureIds } from '@lace-contract/network';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  formatAmountToLocale,
  formatLocaleNumber,
} from '@lace-lib/util-render';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLaceSelector, useStakePools } from '../hooks';

import type { Cardano } from '@cardano-sdk/core';
import type {
  AccountRewardAccountDetailsMap,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type { LaceStakePool } from '@lace-contract/cardano-stake-pools';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type {
  StakeCardProps,
  StakingStatusCardProps,
} from '@lace-lib/ui-toolkit';

const SATURATION_THRESHOLD = 99;

type StakingProblem = 'high-saturation' | 'locked' | 'pledge' | 'retiring';

const detectStakingProblems = (
  rewardAccountInfo: RewardAccountInfo | undefined,
  pool: LaceStakePool | undefined,
): StakingProblem[] => {
  const problems: StakingProblem[] = [];

  const hasNoDrepDelegation = !rewardAccountInfo?.drepId;
  const isPoolRetiring = ['retiring', 'retired'].includes(pool?.status ?? '');
  const isHighSaturation = (pool?.liveSaturation ?? 0) >= SATURATION_THRESHOLD;
  const isPledgeNotMet =
    pool !== undefined && pool.livePledge < pool.declaredPledge;

  if (hasNoDrepDelegation) problems.push('locked');
  if (isPoolRetiring) problems.push('retiring');
  if (isHighSaturation) problems.push('high-saturation');
  if (isPledgeNotMet) problems.push('pledge');

  return problems;
};

const extractPoolIds = (
  cardanoAccounts: unknown,
  rewardAccountDetailsMap: AccountRewardAccountDetailsMap | undefined,
): Cardano.PoolId[] | undefined => {
  if (!Array.isArray(cardanoAccounts) || !rewardAccountDetailsMap) {
    return undefined;
  }

  const uniquePoolIds = new Set<Cardano.PoolId>();
  cardanoAccounts.forEach((account: AnyAccount) => {
    const rewardAccountDetails = rewardAccountDetailsMap[account.accountId];
    const stakePoolId = rewardAccountDetails?.rewardAccountInfo.poolId;
    if (stakePoolId) {
      uniquePoolIds.add(stakePoolId);
    }
  });

  return uniquePoolIds.size > 0 ? Array.from(uniquePoolIds) : undefined;
};

const DEBOUNCE_DELAY_MS = 300;

const BLOCKCHAIN_NAME = { blockchainName: 'Cardano' } as const;

export const useStakingCenter = () => {
  const { t } = useTranslation();
  const stakingStatus = useLaceSelector('cardanoContext.selectStakingStatus');
  const cardanoAccounts = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    BLOCKCHAIN_NAME,
  );
  const tokensGroupedByAccount = useLaceSelector(
    'tokens.selectTokensGroupedByAccount',
  );

  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );

  // Aggregate all pool IDs from all accounts
  const query = useMemo(
    () => extractPoolIds(cardanoAccounts, rewardAccountDetailsMap),
    [cardanoAccounts, rewardAccountDetailsMap],
  );

  const stakePools = useStakePools(query);

  const poolsMap = useMemo(
    () =>
      stakePools.reduce(
        (map, pool) => (pool ? map.set(pool.poolId, pool) : map),
        new Map<Cardano.PoolId | undefined, LaceStakePool>(),
      ),
    [stakePools],
  );

  const networkType = useLaceSelector('network.selectNetworkType');
  const adaDisplayTicker = useMemo(
    () => getAdaTokenTickerByNetwork(networkType),
    [networkType],
  );

  const stakingStatusCard: StakingStatusCardProps = useMemo(
    () => ({
      status: stakingStatus.stakingStatus,
      totalEarned: `${formatLocaleNumber(
        convertLovelacesToAda(stakingStatus.totalRewardsSum, DEFAULT_DECIMALS),
        DEFAULT_DECIMALS,
      )} ${adaDisplayTicker}`,
      totalStaked: `${formatLocaleNumber(
        convertLovelacesToAda(
          stakingStatus.totalStakedAmount,
          DEFAULT_DECIMALS,
        ),
        DEFAULT_DECIMALS,
      )} ${adaDisplayTicker}`,
      totalUnstaked: `${formatLocaleNumber(
        convertLovelacesToAda(
          stakingStatus.totalUnstakedAmount,
          DEFAULT_DECIMALS,
        ),
        DEFAULT_DECIMALS,
      )} ${adaDisplayTicker}`,
    }),
    [stakingStatus, adaDisplayTicker],
  );

  const isBuyAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.BUY_FLOW,
  );

  const handleStake = useCallback((accountId: string) => {
    NavigationControls.sheets.navigate(SheetRoutes.BrowsePool, { accountId });
  }, []);

  const handleAddFunds = useCallback((accountId: string) => {
    NavigationControls.sheets.navigate(SheetRoutes.Buy, { accountId });
  }, []);
  const isStakingStatusLoading = stakingStatus.stakingStatus === 'loading';

  const stakeCards = useMemo<StakeCardProps[]>(() => {
    if (!Array.isArray(cardanoAccounts) || !tokensGroupedByAccount) {
      return [];
    }

    return cardanoAccounts.map((account, index) => {
      const rewardAccountDetails = rewardAccountDetailsMap[account.accountId];
      // Get tokens for this account from the grouped tokens
      const accountTokensData = tokensGroupedByAccount[account.accountId];
      const accountTokens = accountTokensData?.fungible ?? [];

      const stakePoolId = rewardAccountDetails?.rewardAccountInfo.poolId;
      const stakePool = poolsMap.get(stakePoolId);

      // Find ADA token
      const adaToken = accountTokens.find(
        token => token.tokenId === LOVELACE_TOKEN_ID,
      );

      // Format ADA balance
      const balanceCoin = adaToken
        ? formatAmountToLocale(
            adaToken.available.toString(),
            adaToken.decimals ?? ADA_DECIMALS,
          )
        : '0';

      const accountName =
        account.metadata?.name ??
        t('v2.portfolio.account.defaultName', {
          index: index + 1,
        });

      const accountType = t('v2.portfolio.account.blockchainAccountType', {
        blockchain: account.blockchainName || 'Cardano',
      });

      const isStaking = !!stakePoolId;
      const problems = isStaking
        ? detectStakingProblems(
            rewardAccountDetails?.rewardAccountInfo,
            stakePool,
          )
        : [];

      let state: StakeCardProps['state'] = 'stake-available';

      if (isStakingStatusLoading) {
        state = 'loading';
      } else if (balanceCoin === '0') {
        state = 'empty-account';
      } else if (isStaking && !stakePool) {
        state = 'loading';
      } else if (isStaking) {
        state = problems[0] ?? 'low-saturation';
      }

      const stakingData = {
        earnedCoin: formatAmountToLocale(
          rewardAccountDetails?.rewardAccountInfo.rewardsSum.toString() || '0',
          ADA_DECIMALS,
          DEFAULT_DECIMALS,
        ),
        stakedCoin: formatAmountToLocale(
          rewardAccountDetails?.rewardAccountInfo.controlledAmount.toString() ||
            '0',
          ADA_DECIMALS,
          DEFAULT_DECIMALS,
        ),
        ...(stakePool && { poolName: stakePool?.ticker ?? '' }),
      };

      const handleViewDelegation = () => {
        if (!stakePoolId) return;
        // If there are staking problems, navigate to the issue sheet
        if (problems.length > 0) {
          NavigationControls.sheets.navigate(SheetRoutes.StakingIssue, {
            accountId: account.accountId.toString(),
            issueType: problems[0],
          });
        } else {
          NavigationControls.sheets.navigate(SheetRoutes.StakeDelegation, {
            accountId: account.accountId.toString(),
          });
        }
      };

      const handleUpdateDelegation = () => {
        if (problems.length === 0) return;
        NavigationControls.sheets.navigate(SheetRoutes.StakingIssue, {
          accountId: account.accountId.toString(),
          issueType: problems[0],
        });
      };

      const handleDelegate = () => {
        NavigationControls.sheets.navigate(SheetRoutes.StakingIssue, {
          accountId: account.accountId.toString(),
          issueType: 'locked',
        });
      };

      return {
        avatarImage: { uri: '' }, // Placeholder - can be enhanced later
        accountName,
        accountType, // TODO: Use wallet name instead?
        isShielded: false, // TODO: Update with real data when available
        blockchain: 'Cardano',
        state,
        balanceCoin,
        coin: adaDisplayTicker,
        onStake: () => {
          handleStake(account.accountId.toString());
        },
        onAddFunds: isBuyAvailable
          ? () => {
              handleAddFunds(account.accountId.toString());
            }
          : undefined,
        onUpdateDelegation: handleUpdateDelegation,
        onDelegate: handleDelegate,
        ...(isStaking && stakingData),
        ...(isStaking && { onViewDelegation: handleViewDelegation }),
      } satisfies StakeCardProps;
    });
  }, [
    cardanoAccounts,
    tokensGroupedByAccount,
    t,
    stakePools,
    rewardAccountDetailsMap,
    handleStake,
    handleAddFunds,
    isBuyAvailable,
    isStakingStatusLoading,
    adaDisplayTicker,
  ]);

  const hasCardanoAccounts = useMemo(() => {
    return Array.isArray(cardanoAccounts) && cardanoAccounts.length > 0;
  }, [cardanoAccounts]);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const debouncedSetSearchValueRef = useRef(
    debounce((value: string) => {
      setDebouncedSearchValue(value);
    }, DEBOUNCE_DELAY_MS),
  );

  useEffect(() => {
    debouncedSetSearchValueRef.current(searchValue);
  }, [searchValue]);

  useEffect(() => {
    return () => {
      debouncedSetSearchValueRef.current.cancel();
    };
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const filteredStakeCards = useMemo(() => {
    const trimmed = debouncedSearchValue.trim();
    if (!trimmed) return stakeCards;
    const query = trimmed.toLowerCase();
    return stakeCards.filter(card =>
      card.accountName.toLowerCase().includes(query),
    );
  }, [stakeCards, debouncedSearchValue]);

  return {
    stakeCards: filteredStakeCards,
    stakingStatusCard,
    cardanoAccounts,
    hasCardanoAccounts,
    searchValue,
    debouncedSearchValue,
    onSearchChange: handleSearchChange,
  };
};
