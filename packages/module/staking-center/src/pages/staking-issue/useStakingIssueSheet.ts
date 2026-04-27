import {
  ADA_DECIMALS,
  DEFAULT_DECIMALS,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
} from '@lace-lib/navigation';
import { isWeb, openUrl } from '@lace-lib/ui-toolkit';
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
    NavigationControls.sheets.navigate(SheetRoutes.DeregisterPool, {
      accountId: accountIdString,
    });
  }, [accountIdString]);

  const handleUpdate = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.BrowsePool, {
      accountId: accountIdString,
    });
  }, [accountIdString]);

  const handleDelegateVote = useCallback(() => {
    const url = 'https://gov.tools/';
    if (isWeb) {
      void openUrl({ url, onError: () => {} });
    } else {
      NavigationControls.actions.closeAndNavigate(
        StackRoutes.DappExternalWebView,
        {
          title: t('v2.pool-status.delegate-vote'),
          dapp: {
            icon: { img: { uri: 'https://gov.tools/favicon.ico' } },
            name: t('v2.pool-status.delegate-vote'),
            category: '',
          },
          buttonUrl: url,
        },
      );
    }
  }, [t]);

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
      onDelegateVote: handleDelegateVote,
    };
  }

  return {
    ...baseProps,
    state: poolStatusState as 'high-saturation' | 'pledge-not-met' | 'retiring',
  };
};
