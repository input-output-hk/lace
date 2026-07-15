import {
  ADA_DECIMALS,
  DEFAULT_DECIMALS,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
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

  const handleDelegateVote = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.BrowseDRep, {
      accountId: accountIdString,
    });
  }, [accountIdString]);

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
      ...(isGovernanceCenterEnabled && { onDelegateVote: handleDelegateVote }),
    };
  }

  return {
    ...baseProps,
    state: poolStatusState as 'high-saturation' | 'pledge-not-met' | 'retiring',
  };
};
