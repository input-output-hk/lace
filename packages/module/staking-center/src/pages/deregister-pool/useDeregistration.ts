import {
  ADA_DECIMALS,
  DEFAULT_DECIMALS,
  type CardanoAddressData,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls } from '@lace-lib/navigation';
import { formatAmountToLocale } from '@lace-lib/util-render';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useStakePools,
} from '../../hooks';

import type { AnyAddress } from '@lace-contract/addresses';
import type { DeregisterPoolSheetProps } from '@lace-lib/ui-toolkit';

/**
 * Statuses that can be safely reset on component unmount.
 *
 * Note: 'Processing' is intentionally excluded - resetting during transaction
 * processing could leave a submitted transaction untracked. The UI should
 * prevent navigation away during Processing state.
 *
 * Note: 'Success' is handled by DeregisterPoolSheetScreen which navigates to
 * DeregistrationSuccessSheet. The reset happens in DeregistrationSuccessSheet
 * on unmount.
 */
const RESETTABLE_STATUSES = [
  'Idle',
  'CalculatingFees',
  'Summary',
  'AwaitingConfirmation',
  'Error',
] as const;

const LOVELACE_DIVISOR = 1_000_000;

export const useDeregistration = (
  accountIdString: string,
): DeregisterPoolSheetProps | null => {
  const requestFeeCalculation = useDispatchLaceAction(
    'deregistrationFlow.feeCalculationRequested',
  );
  const requestDeregistration = useDispatchLaceAction(
    'deregistrationFlow.deregistrationRequested',
  );
  const resetDeregistrationFlow = useDispatchLaceAction(
    'deregistrationFlow.reset',
  );

  const deregistrationFlowState = useLaceSelector(
    'deregistrationFlow.selectDeregistrationFlowState',
  );
  const accountId = AccountId(accountIdString);

  // Check if state belongs to a different account
  const stateAccountId =
    'accountId' in deregistrationFlowState
      ? deregistrationFlowState.accountId
      : undefined;
  const isStateForDifferentAccount =
    stateAccountId !== undefined && stateAccountId !== accountId;

  // Get account addresses
  const addresses = useLaceSelector('addresses.selectByAccountId', accountId);

  // Get reward account details from store
  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  const rewardAccountDetails = rewardAccountDetailsMap[accountId];

  // Get wallet and account info
  const wallets = useLaceSelector('wallets.selectAll');
  const walletWithAccount = wallets.find(w =>
    w.accounts.some(a => a.accountId === accountId),
  );
  const account = walletWithAccount?.accounts.find(
    a => a.accountId === accountId,
  );

  // Get the delegated pool ID from reward account details
  const poolId = rewardAccountDetails?.rewardAccountInfo?.poolId;

  // Fetch pool data if we have a delegated pool
  const [stakePool] = useStakePools(poolId);

  // Get user's stake key (reward account) from addresses
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

  const statusRef = useRef(deregistrationFlowState.status);
  statusRef.current = deregistrationFlowState.status;

  useEffect(() => {
    // Reset if state is for a different account
    if (isStateForDifferentAccount) {
      resetDeregistrationFlow();
      return;
    }

    // Note: 'Success' status is handled by DeregisterPoolSheetScreen which
    // navigates to DeregistrationSuccessSheet. The reset happens there on unmount.
    const canStartFeeCalculation =
      deregistrationFlowState.status === 'Idle' && accountId;
    if (canStartFeeCalculation) {
      requestFeeCalculation({ accountId });
    }
  }, [
    deregistrationFlowState.status,
    accountId,
    requestFeeCalculation,
    isStateForDifferentAccount,
    resetDeregistrationFlow,
  ]);

  useEffect(() => {
    return () => {
      if (
        RESETTABLE_STATUSES.includes(
          statusRef.current as (typeof RESETTABLE_STATUSES)[number],
        )
      ) {
        resetDeregistrationFlow();
      }
    };
  }, [resetDeregistrationFlow]);

  const handleCancelPress = useCallback(() => {
    resetDeregistrationFlow();
    NavigationControls.sheets.close();
  }, [resetDeregistrationFlow]);

  const areFeesReady = deregistrationFlowState.status === 'Summary';

  const handleDeregisterPress = useCallback(() => {
    if (areFeesReady) {
      requestDeregistration();
    }
  }, [areFeesReady, requestDeregistration]);

  const props = useMemo((): DeregisterPoolSheetProps | null => {
    // Return null if critical data is not yet available
    if (!account) {
      return null;
    }

    if (!stakeKey) {
      return null;
    }

    // Pool info (use placeholder if not available yet)
    const poolName = stakePool?.poolName ?? 'Unknown Pool';
    const poolTicker = stakePool?.ticker ?? '???';

    // Source account info
    const sourceAccountName = account.metadata?.name ?? 'Account';

    // Amount delegated (controlled amount)
    const controlledAmount =
      rewardAccountDetails?.rewardAccountInfo?.controlledAmount?.toString() ??
      '0';
    const amountDelegated = formatAmountToLocale(
      controlledAmount,
      ADA_DECIMALS,
      DEFAULT_DECIMALS,
    );

    const hasFees =
      (deregistrationFlowState.status === 'Summary' ||
        deregistrationFlowState.status === 'AwaitingConfirmation') &&
      !isStateForDifferentAccount;

    const feeLovelace = hasFees
      ? Number(deregistrationFlowState.fees[0]?.amount ?? 0)
      : 0;
    const depositReturnLovelace = hasFees
      ? Number(deregistrationFlowState.depositReturn ?? 0)
      : 0;

    // Format fee and deposit return for display
    const feeAda = feeLovelace / LOVELACE_DIVISOR;
    const depositReturnAda = depositReturnLovelace / LOVELACE_DIVISOR;
    // Total is deposit return minus fee (net gain to user)
    const totalAda = depositReturnAda - feeAda;

    return {
      poolName,
      poolTicker,
      stakeKey,
      amountDelegated,
      coin: adaDisplayTicker,
      sourceAccountName,
      sourceAccountImage: undefined,
      depositReturn: hasFees
        ? `+${depositReturnAda.toFixed(6)}`
        : 'Calculating...',
      transactionFee: hasFees ? `-${feeAda.toFixed(6)}` : 'Calculating...',
      total: hasFees
        ? `${totalAda >= 0 ? '+' : ''}${totalAda.toFixed(6)}`
        : 'Calculating...',
      onCancel: handleCancelPress,
      onDeregister: handleDeregisterPress,
      isDeregisterButtonDisabled: !areFeesReady,
    };
  }, [
    deregistrationFlowState,
    stakePool,
    stakeKey,
    account,
    rewardAccountDetails,
    handleCancelPress,
    handleDeregisterPress,
    isStateForDifferentAccount,
    adaDisplayTicker,
  ]);

  return props;
};
