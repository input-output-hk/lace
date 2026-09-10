import {
  ADA_DECIMALS,
  DEFAULT_DECIMALS,
  getAdaTokenTickerByNetwork,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import {
  earnRewardsMode,
  earnRewardsPoolSelectionId,
  needsEarnRewardsPoolChoice,
  resolveEarnRewardsTarget,
} from '@lace-contract/earn-rewards';
import { FeatureFlagKey } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { formatAmountToLocale } from '@lace-lib/util-render';
import { useCallback, useMemo } from 'react';

import {
  useLaceSelector,
  useIsDeregisterDisabled,
  useStakePools,
} from '../../hooks';

import type { AnyAddress } from '@lace-contract/addresses';
import type { CardanoAddressData } from '@lace-contract/cardano-context';
import type {
  PoolStatusSheetProps,
  PoolStatusState,
} from '@lace-lib/ui-toolkit';

type StakingIssueType = 'high-saturation' | 'locked' | 'pledge' | 'retiring';

const issueTypeToPoolStatusState: Record<StakingIssueType, PoolStatusState> = {
  'high-saturation': 'high-saturation',
  pledge: 'pledge-not-met',
  locked: 'locked-rewards',
  retiring: 'retiring',
};

export const useStakingIssueSheet = (
  accountIdString: string,
  issueType: StakingIssueType,
): PoolStatusSheetProps | null => {
  const { t } = useTranslation();
  const accountId = AccountId(accountIdString);

  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  const rewardAccountDetails = rewardAccountDetailsMap[accountId];

  const addresses = useLaceSelector('addresses.selectByAccountId', accountId);
  const pendingActivitiesByAccount = useLaceSelector(
    'activities.selectPendingActivitiesByAccount',
  );
  const fungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    accountIdString,
  );

  const [stakePool] = useStakePools(
    rewardAccountDetails?.rewardAccountInfo.poolId,
  );

  const stakeKey = useMemo(() => {
    if (!addresses || addresses.length === 0) return '';
    const firstAddress = (addresses as AnyAddress<CardanoAddressData>[]).find(
      addr => addr?.data?.rewardAccount,
    );
    return firstAddress?.data?.rewardAccount?.toString() || '';
  }, [addresses]);

  const networkType = useLaceSelector('network.selectNetworkType');
  const adaDisplayTicker = useMemo(
    () => getAdaTokenTickerByNetwork(networkType),
    [networkType],
  );

  const totalStaked = formatAmountToLocale(
    rewardAccountDetails?.rewardAccountInfo.controlledAmount.toString() || '0',
    ADA_DECIMALS,
    DEFAULT_DECIMALS,
  );

  const totalRewards = formatAmountToLocale(
    rewardAccountDetails?.rewardAccountInfo.rewardsSum.toString() || '0',
    ADA_DECIMALS,
    DEFAULT_DECIMALS,
  );

  const isDeregisterDisabled = useIsDeregisterDisabled(
    rewardAccountDetails?.rewardAccountInfo,
  );

  const handleDeRegister = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.DeregisterPool, {
      accountId: accountIdString,
    });
  }, [accountIdString]);

  const handleUpdate = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.BrowsePool, {
      accountId: accountIdString,
    });
  }, [accountIdString]);

  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const isGovernanceCenterEnabled = useMemo(
    () =>
      featureFlags.some(
        flag => flag.key === FeatureFlagKey('GOVERNANCE_CENTER'),
      ),
    [featureFlags],
  );

  // Locked rewards mean no DRep is delegated — the earn-rewards audience. Route
  // into the one-tap flow when it applies; the sheet derives the offer itself.
  const chainId = useLaceSelector('cardanoContext.selectChainId');
  const earnRewardsTarget = useMemo(
    () => resolveEarnRewardsTarget({ featureFlags, chainId }),
    [featureFlags, chainId],
  );
  const adaAvailable = fungibleTokens.find(
    token => token.tokenId === LOVELACE_TOKEN_ID,
  )?.available;
  const offerMode = earnRewardsTarget
    ? earnRewardsMode({
        rewardAccountInfo: rewardAccountDetails?.rewardAccountInfo,
        hasPendingTx: (pendingActivitiesByAccount[accountId]?.length ?? 0) > 0,
        hasAda:
          adaAvailable !== undefined && BigInt(adaAvailable.toString()) > 0n,
        hasDRep: earnRewardsTarget?.dRep !== undefined,
      })
    : undefined;
  const isEarnRewardsApplicable = offerMode !== undefined;

  const handleDelegateVote = useCallback(() => {
    // Straight to the pool list when there is a pool to choose. This sheet's
    // cohort already stakes (its rewards are locked for want of a vote), so
    // the offer is vote-only and no pool is asked for — the guard is here for
    // the day another state routes through it.
    if (
      needsEarnRewardsPoolChoice({
        target: earnRewardsTarget,
        mode: offerMode,
      })
    ) {
      NavigationControls.navigate(SheetRoutes.BrowsePool, {
        accountId: accountIdString,
        poolSelectionId: earnRewardsPoolSelectionId(accountIdString),
        // What THIS flow's transaction will do — the vote leg rides along only
        // when a DRep is promoted.
        poolSelectionNotice:
          earnRewardsTarget?.dRep === undefined ? 'stake' : 'stake-and-vote',
      });
      return;
    }
    NavigationControls.navigate(
      isEarnRewardsApplicable
        ? SheetRoutes.EarnRewards
        : SheetRoutes.BrowseDRep,
      { accountId: accountIdString },
    );
  }, [accountIdString, earnRewardsTarget, offerMode, isEarnRewardsApplicable]);

  const poolStatusState = issueTypeToPoolStatusState[issueType];

  const primaryWarningMessage = useMemo((): string | undefined => {
    switch (issueType) {
      case 'high-saturation':
        return undefined; // No warning above saturation bar
      case 'locked':
        return undefined; // No warning above saturation bar
      case 'pledge':
        return t('v2.pool-status.warning.pledge-not-met');
      case 'retiring':
        return t('v2.pool-status.warning.retiring');
    }
  }, [issueType, t]);

  const saturationWarningMessage = useMemo((): string | undefined => {
    switch (issueType) {
      case 'high-saturation':
        return t('v2.pool-status.warning.high-saturation');
      case 'pledge':
        return undefined; // No warning below saturation bar
      case 'locked':
        return t('v2.pool-status.warning.locked-rewards');
      case 'retiring':
        return undefined; // No warning below saturation bar
    }
  }, [issueType, t]);

  const saturationPercentage = stakePool?.liveSaturation ?? 0;

  if (!stakePool) return null;

  const baseProps = {
    poolName: stakePool.poolName || '',
    poolTicker: stakePool.ticker || '',
    totalStaked,
    totalRewards,
    coin: adaDisplayTicker,
    primaryWarningMessage,
    saturationWarningMessage,
    stakeKey,
    saturationPercentage,
    secondaryButtonLabel: t('v2.pool-status.button.de-register'),
    isSecondaryButtonDisabled: isDeregisterDisabled,
    primaryButtonLabel: t('v2.pool-status.button.update'),
    onSecondaryPress: handleDeRegister,
    onPrimaryPress: handleUpdate,
  };

  if (issueType === 'locked') {
    return {
      ...baseProps,
      state: 'locked-rewards' as const,
      // No handler when the governance center is disabled — the sheet hides the button.
      ...(isGovernanceCenterEnabled && {
        onDelegateVote: handleDelegateVote,
        // Named by the outcome the press delivers, not the certificate it
        // signs. This cohort already stakes, so the flow it opens is the
        // "Unlock rewards" one — same words as that sheet's header and its
        // confirm button. Only a first-time offer would read "Earn rewards".
        ...(isEarnRewardsApplicable && {
          delegateVoteLabel: t(
            offerMode === 'vote-only'
              ? 'v2.earn-rewards.unlock.nudge.cta'
              : 'v2.earn-rewards.stake-cta',
          ),
        }),
      }),
    };
  }

  return {
    ...baseProps,
    state: poolStatusState as 'high-saturation' | 'pledge-not-met' | 'retiring',
  };
};
