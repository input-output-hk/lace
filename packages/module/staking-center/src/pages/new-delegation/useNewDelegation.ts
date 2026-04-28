import { useAnalytics } from '@lace-contract/analytics';
import {
  type CardanoAddressData,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useStakePools,
} from '../../hooks';
import { useAdaPrice } from '../useAdaPrice';

import { formatFeeDisplay, getPoolDisplayData } from './utils';

import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type { StakeDelegationSheetProps } from '@lace-lib/ui-toolkit';

const RESETTABLE_STATUSES = [
  'Idle',
  'CalculatingFees',
  'Summary',
  'AwaitingConfirmation',
  'Error',
] as const;

export const useNewDelegation = (
  poolId: Cardano.PoolId,
  accountIdString: string,
): StakeDelegationSheetProps | null => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const requestFeeCalculation = useDispatchLaceAction(
    'delegationFlow.feeCalculationRequested',
  );
  const requestDelegation = useDispatchLaceAction(
    'delegationFlow.delegationRequested',
  );
  const resetDelegationFlow = useDispatchLaceAction('delegationFlow.reset');

  const delegationFlowState = useLaceSelector(
    'delegationFlow.selectDelegationFlowState',
  );
  const accountId = AccountId(accountIdString);

  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const account = useMemo(
    () => allAccounts.find(a => a.accountId === accountId),
    [allAccounts, accountId],
  );

  // Get account addresses using parameterized selector (better memoization)
  const addresses = useLaceSelector('addresses.selectByAccountId', accountId);
  const [stakePool] = useStakePools(poolId);
  const stakePoolRef = useRef(stakePool);
  stakePoolRef.current = stakePool;

  const { adaPrice, currency } = useAdaPrice();

  const networkType = useLaceSelector('network.selectNetworkType');
  const adaDisplayTicker = useMemo(
    () => getAdaTokenTickerByNetwork(networkType),
    [networkType],
  );

  const partialValue = useMemo(
    () => ({ valueTicker: adaDisplayTicker, exchangeTicker: currency.name }),
    [adaDisplayTicker, currency],
  );

  // Get user's stake key (reward account) from addresses
  const stakeKey = useMemo(() => {
    if (!addresses || addresses.length === 0) return '';
    const firstAddress = (addresses as AnyAddress<CardanoAddressData>[]).find(
      addr => addr?.data?.rewardAccount,
    );
    return firstAddress?.data?.rewardAccount?.toString() || '';
  }, [addresses]);

  const statusRef = useRef(delegationFlowState.status);
  statusRef.current = delegationFlowState.status;

  useEffect(() => {
    if (delegationFlowState.status === 'Success') {
      const ticker = stakePoolRef.current?.ticker;
      trackEvent(
        'staking | delegation | confirmed',
        ticker ? { ticker } : undefined,
      );
      resetDelegationFlow();
      return;
    }

    if (delegationFlowState.status === 'Error') {
      const isStaleError =
        delegationFlowState.poolId !== poolId ||
        delegationFlowState.accountId !== accountId;
      if (isStaleError) {
        resetDelegationFlow();
        return;
      }
    }

    const canStartFeeCalculation =
      delegationFlowState.status === 'Idle' && poolId && accountId;
    if (canStartFeeCalculation) {
      requestFeeCalculation({ accountId, poolId });
    }
  }, [
    delegationFlowState,
    poolId,
    accountId,
    requestFeeCalculation,
    resetDelegationFlow,
    trackEvent,
  ]);

  useEffect(() => {
    return () => {
      if (
        RESETTABLE_STATUSES.includes(
          statusRef.current as (typeof RESETTABLE_STATUSES)[number],
        )
      ) {
        resetDelegationFlow();
      }
    };
  }, [resetDelegationFlow]);

  const handleCancelPress = useCallback(() => {
    resetDelegationFlow();
    NavigationControls.sheets.close();
  }, [resetDelegationFlow]);

  const areFeesReady = delegationFlowState.status === 'Summary';

  const handleDelegatePress = useCallback(() => {
    if (areFeesReady) {
      requestDelegation();
    }
  }, [areFeesReady, requestDelegation]);

  const props = useMemo((): StakeDelegationSheetProps | null => {
    if (!stakePool) return null;

    const poolData = getPoolDisplayData(stakePool, adaPrice);
    const hasFees =
      delegationFlowState.status === 'Summary' ||
      delegationFlowState.status === 'AwaitingConfirmation';

    const feeLovelace = hasFees
      ? Number(delegationFlowState.fees[0]?.amount ?? 0)
      : 0;
    const depositLovelace = hasFees
      ? Number(delegationFlowState.deposit ?? 0)
      : 0;
    const feeData = hasFees
      ? formatFeeDisplay(feeLovelace, depositLovelace, adaDisplayTicker)
      : null;

    return {
      headerTitle: t('v2.pages.pool-details.title'),
      poolAvatarFallback: poolData.poolAvatarFallback,
      poolName: poolData.poolName,
      poolTicker: poolData.poolTicker,
      stakeKeyLabel: t('v2.pages.stake-delegation.stake-key'),
      stakeKey,
      saturationLabel: t('v2.pages.stake-delegation.saturation'),
      saturationPercentage: poolData.saturationPercentage,
      marginLabel: t('v2.pages.stake-delegation.margin'),
      margin: `${poolData.marginPercentage}%`,
      pledgeLabel: t('v2.pages.stake-delegation.pledge'),
      pledge: {
        ...partialValue,
        value: poolData.pledgeAda,
        exchange: poolData.pledgeExchange,
      },
      costLabel: t('v2.pages.stake-delegation.cost'),
      cost: {
        ...partialValue,
        value: poolData.costAda,
        exchange: poolData.costExchange,
      },
      delegatedStakeLabel: t('v2.pages.stake-delegation.delegated-stake'),
      delegatedStake: {
        ...partialValue,
        value: poolData.activeStakeAda,
        exchange: poolData.activeStakeExchange,
      },
      sourceAccountLabel: t('v2.pages.stake-delegation.source-account'),
      sourceAccount: {
        name:
          account?.metadata?.name ||
          t('v2.portfolio.account.defaultName', { index: 1 }),
        avatarFallback: (account?.metadata?.name || 'A1').slice(0, 2),
      },
      expiresByLabel: t('v2.pages.stake-delegation.expires-by'),
      expiresBy: {
        date: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleDateString(),
        time: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleTimeString(),
      },
      totalBreakdownLabel: t('v2.pages.stake-delegation.total-breakdown'),
      stakeKeyDepositLabel: feeData?.depositAda
        ? t('v2.pages.stake-delegation.stake-key-deposit')
        : undefined,
      stakeKeyDepositAda: feeData?.depositAda,
      transactionFeeLabel: t('v2.pages.stake-delegation.transaction-fee'),
      transactionFeeAda: feeData?.feeAda ?? 'Calculating...',
      totalLabel: t('v2.pages.stake-delegation.total'),
      totalAda: feeData?.totalAda ?? 'Calculating...',
      onCancelPress: handleCancelPress,
      onDelegatePress: handleDelegatePress,
      cancelButtonLabel: t('v2.generic.cancel'),
      delegateButtonLabel: t('v2.sheets.stake-delegation.delegate-button'),
    };
  }, [
    account,
    adaDisplayTicker,
    adaPrice,
    delegationFlowState,
    partialValue,
    stakePool,
    stakeKey,
    handleCancelPress,
    handleDelegatePress,
    t,
  ]);

  return props;
};
