import {
  ADA_DECIMALS,
  LOVELACE_TOKEN_ID,
  DEFAULT_DECIMALS,
  convertLovelacesToAda,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { toPercentage } from '@lace-contract/cardano-stake-pools';
import {
  earnRewardsPoolSelectionId,
  earnRewardsMode,
  needsEarnRewardsPoolChoice,
  resolveEarnRewardsTarget,
} from '@lace-contract/earn-rewards';
import { FeatureFlagKey } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import { FeatureIds } from '@lace-contract/network';
import { getTokenPriceId } from '@lace-contract/token-pricing';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  formatAmountToLocale,
  formatLocaleNumber,
} from '@lace-lib/util-render';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLaceSelector, useStakePools } from '../hooks';
import { useNetworkInfo } from '../hooks/useNetworkInfo';
import { formatProductCardBalance } from '../utils';
import { formatHubTotalEarned } from '../utils/hubTotalEarned';

import type { Cardano } from '@cardano-sdk/core';
import type {
  AccountRewardAccountDetailsMap,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type { LaceStakePool } from '@lace-contract/cardano-stake-pools';
import type { EarnRewardsMode } from '@lace-contract/earn-rewards';
import type { StakingCenterProductCard } from '@lace-contract/staking-center';
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

const deriveStakeCardState = ({
  isStakingStatusLoading,
  balanceCoin,
  isStaking,
  stakePool,
  problems,
}: {
  isStakingStatusLoading: boolean;
  balanceCoin: string;
  isStaking: boolean;
  stakePool: LaceStakePool | undefined;
  problems: StakingProblem[];
}): StakeCardProps['state'] => {
  if (isStakingStatusLoading) return 'loading';
  if (balanceCoin === '0') return 'empty-account';
  if (isStaking && !stakePool) return 'loading';
  if (isStaking) return problems[0] ?? 'low-saturation';
  return 'stake-available';
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
  const networkInfoCard = useNetworkInfo();
  const stakingStatus = useLaceSelector('cardanoContext.selectStakingStatus');
  const cardanoAccounts = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    BLOCKCHAIN_NAME,
  );
  const tokensGroupedByAccount = useLaceSelector(
    'tokens.selectTokensGroupedByAccount',
  );
  const pendingActivitiesByAccount = useLaceSelector(
    'activities.selectPendingActivitiesByAccount',
  );
  // Fungible tokens aggregated across accounts on the ACTIVE network only — the
  // source for the two Total Balance figures (ADA for the Cardano card, sUSDr
  // for product cards). Network-scoped so switching e.g. preview → preprod
  // doesn't leak the other network's balances (ADR 11).
  const aggregatedFungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensForVisibleAccounts',
  );

  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );

  // Aggregate all pool IDs from all accounts
  const query = useMemo(
    () => extractPoolIds(cardanoAccounts, rewardAccountDetailsMap),
    [cardanoAccounts, rewardAccountDetailsMap],
  );

  const stakePools = useStakePools(query, true);

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

  // Total ADA across all accounts (the wallet's ADA holdings, not just staked).
  const totalAdaDisplay = useMemo(() => {
    const adaToken = aggregatedFungibleTokens.find(
      token => token.tokenId === LOVELACE_TOKEN_ID,
    );
    // No ADA token entry can mean "still loading" as easily as "truly zero" —
    // an em dash never invents a 0 balance during load; a loaded wallet always
    // has a lovelace entry (possibly 0).
    if (!adaToken) return `— ${adaDisplayTicker}`;
    const amount = formatAmountToLocale(
      adaToken.available.toString(),
      adaToken.decimals ?? ADA_DECIMALS,
      DEFAULT_DECIMALS,
    );
    return `${amount} ${adaDisplayTicker}`;
  }, [aggregatedFungibleTokens, adaDisplayTicker]);

  // Cardano card Yield = average of the delegated pools' estimated ROS,
  // weighted by each staked account's controlled amount. Accounts that aren't
  // delegated (or whose pool hasn't loaded yet) contribute nothing.
  const cardanoYieldDisplay = useMemo(() => {
    // Accounts not resolved yet = loading, not an actual 0% yield.
    if (!Array.isArray(cardanoAccounts)) return '—';
    let weightedRos = 0;
    let totalStaked = 0;
    cardanoAccounts.forEach((account: AnyAccount) => {
      const info =
        rewardAccountDetailsMap[account.accountId]?.rewardAccountInfo;
      const pool = poolsMap.get(info?.poolId);
      // A delegated pool whose ROS estimate hasn't resolved must not join the
      // average — counting its stake with a 0 numerator dilutes real yields.
      if (!info?.poolId || pool?.ros === undefined) return;
      const staked = Number(info.controlledAmount);
      weightedRos += staked * pool.ros;
      totalStaked += staked;
    });
    if (totalStaked === 0) return `0%`;
    return `${toPercentage(weightedRos / totalStaked)}%`;
  }, [cardanoAccounts, rewardAccountDetailsMap, poolsMap]);

  const currencyPreference = useLaceSelector(
    'tokenPricing.selectCurrencyPreference',
  );
  const usdToCurrencyRate = useLaceSelector(
    'tokenPricing.selectUsdToCurrencyRate',
  );
  // Fresh ADA→USD price for valuing lifetime Cardano rewards in the hub's
  // combined Total Earned; undefined while unpriced/stale (no invented value).
  const prices = useLaceSelector('tokenPricing.selectPrices');
  const activeNetworkIdForEarned = useLaceSelector(
    'network.selectActiveNetworkId',
    'Cardano',
  );
  const loadedFeaturesForEarned = useLaceSelector(
    'features.selectLoadedFeatures',
  );

  const productCardBalanceOf = useCallback(
    (card: StakingCenterProductCard): string =>
      formatProductCardBalance(
        card,
        {
          // Per-render resolution: live vault rate + flag-payload token ids —
          // a load-time snapshot froze a cold boot's $1 fallback for the mount.
          usdBalance: card.usdBalance?.(
            loadedFeaturesForEarned.featureFlags,
            activeNetworkIdForEarned,
          ),
          aggregatedFungibleTokens,
        },
        {
          currency: currencyPreference,
          usdToCurrencyRate,
          // Funds mid-flow (unstake cooldown / withdraw-ready) that have left
          // every wallet balance — supplied per render by the card (LW-14651 AC1).
          pendingUsd: card.pendingUsd?.(
            loadedFeaturesForEarned.featureFlags,
            activeNetworkIdForEarned,
          ),
        },
      ),
    [
      aggregatedFungibleTokens,
      currencyPreference,
      usdToCurrencyRate,
      loadedFeaturesForEarned,
      activeNetworkIdForEarned,
    ],
  );
  const adaPriceUsd = useMemo(() => {
    const adaToken = aggregatedFungibleTokens.find(
      token => token.tokenId === LOVELACE_TOKEN_ID,
    );
    const priceId = adaToken ? getTokenPriceId(adaToken) : undefined;
    const price = priceId ? prices?.[priceId] : undefined;
    return price && price.priceInUsd > 0 && !price.isStale
      ? price.priceInUsd
      : undefined;
  }, [aggregatedFungibleTokens, prices]);

  /**
   * The hub's Staking Status card (LW-14651): combined "Total Earned" =
   * lifetime Cardano rewards (at the live ADA price) + each product card's
   * token earnings (live wallet balance × the card's USD-earned rate), in the
   * selected display currency. `undefined` hides the card — it renders only
   * once the user has at least one staking position (Cardano delegation or a
   * held product token); a visible-but-unpriceable total shows the loading
   * shimmer rather than a partial figure.
   */
  const hubStakingStatusOf = useCallback(
    (cards: StakingCenterProductCard[]): StakingStatusCardProps | undefined => {
      const earnedTokens = cards.flatMap(
        card =>
          card.earnedUsdPerToken?.(
            loadedFeaturesForEarned.featureFlags,
            activeNetworkIdForEarned,
          ) ?? [],
      );
      // A position is held tokens OR funds mid-unstake (cooldown / awaiting
      // claim, which have left every wallet balance) — a pending-only user
      // still has a staking position the card must reflect.
      const hasProductPosition =
        earnedTokens.some(({ tokenId }) => {
          const token = aggregatedFungibleTokens.find(
            entry => entry.tokenId === tokenId,
          );
          return token !== undefined && Number(token.available.toString()) > 0;
        }) ||
        cards.some(
          card =>
            (card.pendingUsd?.(
              loadedFeaturesForEarned.featureFlags,
              activeNetworkIdForEarned,
            ) ?? 0) > 0,
        );
      const hasCardanoPosition = stakingStatus.stakingStatus === 'staked';
      if (!hasCardanoPosition && !hasProductPosition) return undefined;
      const totalEarned = formatHubTotalEarned({
        // Lifetime rewards are a historical sum — an undelegated wallet keeps
        // its past earnings; only the card's visibility is position-gated.
        cardanoRewardsLovelace: stakingStatus.totalRewardsSum.toString(),
        adaPriceUsd,
        earnedTokens,
        aggregatedFungibleTokens,
        currencyContext: {
          currency: currencyPreference,
          usdToCurrencyRate,
        },
      });
      // AC label is "Total Earned" (LW-14651) — override the molecule's
      // status-derived "Total rewards earned" heading.
      const title = t('v2.generic.staking.center.total-earned');
      return { status: 'staked', title, totalEarned };
    },
    [
      loadedFeaturesForEarned,
      activeNetworkIdForEarned,
      aggregatedFungibleTokens,
      stakingStatus,
      adaPriceUsd,
      currencyPreference,
      usdToCurrencyRate,
      t,
    ],
  );

  const isBuyAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.BUY_FLOW,
  );

  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const isGovernanceCenterEnabled = useMemo(
    () =>
      featureFlags.some(
        flag => flag.key === FeatureFlagKey('GOVERNANCE_CENTER'),
      ),
    [featureFlags],
  );

  // Earn rewards supersedes the plain "Stake" CTA for any account whose vote is
  // not yet delegated: when the feature is enabled and a target resolves, the
  // primary action becomes the one-tap flow — joining the promoted pool and DRep
  // for an undelegated account, or delegating the vote alone for one that already
  // stakes.
  const chainId = useLaceSelector('cardanoContext.selectChainId');
  const earnRewardsTarget = useMemo(
    () => resolveEarnRewardsTarget({ featureFlags, chainId }),
    [featureFlags, chainId],
  );
  // A resolved target already implies the feature is enabled (see the resolver).
  const isEarnRewardsAvailable = !!earnRewardsTarget;

  const handleStake = useCallback((accountId: string) => {
    NavigationControls.navigate(SheetRoutes.BrowsePool, { accountId });
  }, []);

  const handleEarnRewards = useCallback(
    (accountId: string, mode: EarnRewardsMode | undefined) => {
      // Straight to the pool list when there is a pool to choose. A vote-only
      // account already stakes, so it is never asked.
      if (needsEarnRewardsPoolChoice({ target: earnRewardsTarget, mode })) {
        NavigationControls.navigate(SheetRoutes.BrowsePool, {
          accountId,
          poolSelectionId: earnRewardsPoolSelectionId(accountId),
          // What THIS flow's transaction will do — the vote leg rides along
          // only when a DRep is promoted.
          poolSelectionNotice:
            earnRewardsTarget?.dRep === undefined ? 'stake' : 'stake-and-vote',
        });
        return;
      }
      NavigationControls.navigate(SheetRoutes.EarnRewards, { accountId });
    },
    [earnRewardsTarget],
  );

  const handleAddFunds = useCallback((accountId: string) => {
    NavigationControls.navigate(SheetRoutes.Buy, { accountId });
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

      const state = deriveStakeCardState({
        isStakingStatusLoading,
        balanceCoin,
        isStaking,
        stakePool,
        problems,
      });

      // Reroute the primary CTA to earn-rewards only for the shared audience —
      // the one rule the nudge and governance center also use.
      const offerMode = earnRewardsMode({
        rewardAccountInfo: rewardAccountDetails?.rewardAccountInfo,
        hasPendingTx:
          (pendingActivitiesByAccount[account.accountId]?.length ?? 0) > 0,
        hasAda:
          adaToken !== undefined && BigInt(adaToken.available.toString()) > 0n,
        hasDRep: earnRewardsTarget?.dRep !== undefined,
      });
      const isEarnRewardsApplicable =
        isEarnRewardsAvailable && offerMode !== undefined;

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
          NavigationControls.navigate(SheetRoutes.StakingIssue, {
            accountId: account.accountId.toString(),
            issueType: problems[0],
          });
        } else {
          NavigationControls.navigate(SheetRoutes.StakeDelegation, {
            accountId: account.accountId.toString(),
          });
        }
      };

      const handleUpdateDelegation = () => {
        if (problems.length === 0) return;
        NavigationControls.navigate(SheetRoutes.StakingIssue, {
          accountId: account.accountId.toString(),
          issueType: problems[0],
        });
      };

      const handleDelegate = () => {
        // Same destination as this card's "update delegation" route into the
        // locked-rewards sheet, so one account cannot get two different flows
        // depending on which control it taps.
        if (isEarnRewardsApplicable) {
          handleEarnRewards(account.accountId.toString(), offerMode);
          return;
        }
        // Vote delegation lives in the governance center; fall back to the
        // staking-issue explainer only when that module is disabled.
        if (isGovernanceCenterEnabled) {
          NavigationControls.navigate(SheetRoutes.BrowseDRep, {
            accountId: account.accountId.toString(),
          });
          return;
        }
        NavigationControls.navigate(SheetRoutes.StakingIssue, {
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
        onStake: isEarnRewardsApplicable
          ? () => {
              handleEarnRewards(account.accountId.toString(), offerMode);
            }
          : () => {
              handleStake(account.accountId.toString());
            },
        // Labelled by the OUTCOME, for every account whose next step is to
        // start earning — not only the ones the one-tap flow can serve. An
        // account that already has a DRep is excluded from that flow (changing
        // a delegation is a deliberate action it never messages), and calling
        // its button "Stake" while its neighbour said "Earn rewards" made the
        // two read as different offers when they are the same one: the button
        // names the mechanism in one card and the result in the other, and the
        // only thing that varies is a governance delegation the user cannot
        // see from here. Both now open the pool list.
        ...(isEarnRewardsAvailable &&
          state === 'stake-available' && {
            ctaLabelOverride: t('v2.earn-rewards.stake-cta'),
          }),
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
    handleEarnRewards,
    isBuyAvailable,
    isEarnRewardsAvailable,
    isGovernanceCenterEnabled,
    isStakingStatusLoading,
    pendingActivitiesByAccount,
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
    hubStakingStatusOf,
    totalAdaDisplay,
    cardanoYieldDisplay,
    productCardBalanceOf,
    networkInfoCard,
    cardanoAccounts,
    hasCardanoAccounts,
    searchValue,
    debouncedSearchValue,
    onSearchChange: handleSearchChange,
  };
};
