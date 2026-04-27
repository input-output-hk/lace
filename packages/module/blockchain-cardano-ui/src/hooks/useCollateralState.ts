import {
  COLLATERAL_AMOUNT_LOVELACES,
  convertLovelacesToAda,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import {
  CardanoTokenPriceId,
  FEATURE_FLAG_TOKEN_PRICING,
  TOKEN_PRICING_NETWORK_TYPE,
} from '@lace-contract/token-pricing';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { valueToLocale } from '@lace-lib/util-render';
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';

import { useLaceSelector, useDispatchLaceAction } from '../hooks';

import type { FeeEntry } from '@lace-contract/tx-executor';

export type CollateralStateType =
  | 'failure'
  | 'initializing'
  | 'not-enough-balance'
  | 'not-set'
  | 'set';

interface EstimatedFee {
  ada: number;
  fiat?: number;
  /** Formatted fiat value for display (same as tokens-list: valueToLocale(fiatValue, 2, 2)) */
  fiatFormatted?: string;
}

interface CollateralState {
  state: CollateralStateType;
  collateralAmount?: number;
  estimatedFee?: EstimatedFee;
  currency?: { name: string; ticker: string };
  handleSetCollateral: () => void;
  handleReclaimCollateral: () => void;
  handleClose: () => void;
  isProcessing: boolean;
}

interface UseCollateralStateProps {
  accountId: string;
  walletId: string;
}

export const useCollateralState = ({
  accountId,
  walletId,
}: UseCollateralStateProps): CollateralState => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Get collateral flow state
  const collateralFlowState = useLaceSelector('collateralFlow.selectState');
  const previousStatusRef = useRef(collateralFlowState.status);
  const previousFlowAccountIdRef = useRef<string | undefined>(undefined);
  // True only after THIS instance's buildRequested actually progressed the state
  // machine (Idle → Building). Used as both a render gate (show loader until the
  // flow starts) and a close guard (ignore stale Ready→Idle from previous cleanup).
  // Must be state (not ref) so the `state` memo re-evaluates when it flips.
  const [hasInitiatedFlow, setHasInitiatedFlow] = useState(false);

  // Get wallet by walletId
  const wallet = useLaceSelector('wallets.selectWalletById', walletId);

  const currency = useLaceSelector('tokenPricing.selectCurrencyPreference');

  const networkType = useLaceSelector('network.selectNetworkType');
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const isTokenPricingEnabled = useMemo(
    () =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TOKEN_PRICING) &&
      networkType === TOKEN_PRICING_NETWORK_TYPE,
    [featureFlags, networkType],
  );

  // Token prices (same pattern as tokens-list); selector provided by host (e.g. app-mobile)
  const allPrices = useLaceSelector('tokenPricing.selectPrices');

  // Toast action
  const showToast = useDispatchLaceAction('ui.showToast');

  // Get account from wallet
  const account = useMemo(() => {
    if (!wallet) return null;
    return (
      wallet.accounts.find(a => a.accountId === AccountId(accountId)) ?? null
    );
  }, [wallet, accountId]);

  // Dispatch actions
  const dispatchBuildRequested = useDispatchLaceAction(
    'collateralFlow.buildRequested',
  );
  const dispatchConfirmed = useDispatchLaceAction('collateralFlow.confirmed');
  const dispatchReclaimRequested = useDispatchLaceAction(
    'collateralFlow.reclaimRequested',
  );
  const dispatchClosed = useDispatchLaceAction('collateralFlow.closed', true);

  // Reset collateral flow to Idle when sheet unmounts (e.g. swipe/back gesture).
  // Without this, closing via gesture leaves the state machine in place; opening
  // the sheet for another account then shows stale data and wrong account on confirm.
  // Guard: skip if already Idle (flow completed normally and auto-closed the sheet)
  // to avoid dispatching `closed` into a state that has no handler for it.
  useEffect(() => {
    return () => {
      if (previousStatusRef.current !== 'Idle') {
        dispatchClosed();
      }
    };
  }, [dispatchClosed]);

  // Initialize state machine when Idle and we have account/wallet.
  // Reacts to status changes so that if this instance mounts while the previous
  // instance's dispatchClosed cleanup is still in-flight (status not yet Idle),
  // it still dispatches buildRequested once the status settles to Idle.
  useEffect(() => {
    if (
      collateralFlowState.status === 'Idle' &&
      !hasInitiatedFlow &&
      account &&
      wallet &&
      account.blockchainName === 'Cardano' &&
      accountId &&
      walletId
    ) {
      dispatchBuildRequested({
        accountId: AccountId(accountId),
        wallet,
      });
    }
  }, [collateralFlowState.status]);

  // Close sheet and show toast messages when status changes to Idle
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const currentStatus = collateralFlowState.status;

    // Mark flow as initiated once THIS instance's buildRequested actually
    // progresses the state machine (Idle → Building/etc.). This is set here
    // (not in the init effect) because effects run in declaration order within
    // the same render — setting it in the init effect would be visible to the
    // close guard below in the same pass, defeating the purpose.
    if (previousStatus === 'Idle' && currentStatus !== 'Idle') {
      setHasInitiatedFlow(true);
    }

    // Track which account the flow belongs to when in progress (so we only show toast for the current sheet's account)
    if (currentStatus !== 'Idle' && 'accountId' in collateralFlowState) {
      const flowAccountId = collateralFlowState.accountId;
      previousFlowAccountIdRef.current =
        typeof flowAccountId === 'string'
          ? flowAccountId
          : String(flowAccountId);
    }

    // Only handle transitions TO Idle (not if already Idle on mount)
    if (previousStatus !== 'Idle' && currentStatus === 'Idle') {
      const isCompletedFlowForCurrentAccount =
        previousFlowAccountIdRef.current !== undefined &&
        String(accountId) === previousFlowAccountIdRef.current;

      if (isCompletedFlowForCurrentAccount && hasInitiatedFlow) {
        // Close sheet when transitioning to Idle
        NavigationControls.sheets.close();

        // Show toast when transitioning from Reclaiming to Idle
        if (previousStatus === 'Reclaiming') {
          showToast({
            text: t('collateral.sheet.reclaimed.success'),
            color: 'positive',
            duration: 3,
            leftIcon: {
              name: 'Checkmark',
              size: 20,
              color: theme.brand.white,
            },
          });
        }

        // Show toast when transitioning from Confirming to Idle
        if (
          previousStatus === 'Confirming' ||
          previousStatus === 'AwaitingUtxo' ||
          previousStatus === 'SettingUnspendable'
        ) {
          showToast({
            text: t('collateral.sheet.added.success'),
            color: 'positive',
            duration: 3,
            leftIcon: {
              name: 'Checkmark',
              size: 20,
              color: theme.brand.white,
            },
          });
        }
      }
    }

    // Update ref for next render
    previousStatusRef.current = currentStatus;
  }, [
    collateralFlowState,
    accountId,
    showToast,
    t,
    theme.brand.white,
    hasInitiatedFlow,
  ]);

  const isProcessing = useMemo(() => {
    return (
      collateralFlowState.status === 'Building' ||
      collateralFlowState.status === 'Confirming' ||
      collateralFlowState.status === 'Submitting' ||
      collateralFlowState.status === 'AwaitingUtxo' ||
      collateralFlowState.status === 'SettingUnspendable' ||
      collateralFlowState.status === 'DiscardingTx' ||
      collateralFlowState.status === 'Reclaiming'
    );
  }, [collateralFlowState.status]);

  // Map state machine state to UI state.
  // Show loader until this instance's flow has actually progressed past Idle,
  // so stale state from a previous instance is never rendered.
  const state: CollateralStateType = useMemo(() => {
    if (!hasInitiatedFlow) {
      return 'initializing';
    }
    if (collateralFlowState.status === 'Failure') {
      return 'failure';
    } else if (
      collateralFlowState.status === 'Requested' ||
      collateralFlowState.status === 'Idle' ||
      collateralFlowState.status === 'Building'
    ) {
      return 'initializing';
    }
    if (collateralFlowState.status === 'NotEnoughBalance') {
      return 'not-enough-balance';
    }
    if (
      collateralFlowState.status === 'Set' ||
      collateralFlowState.status === 'Reclaiming'
    ) {
      return 'set';
    }
    return 'not-set';
  }, [collateralFlowState.status, hasInitiatedFlow]);

  // Get collateral amount from constant (5 ADA)
  // Convert lovelace to ADA using convertLovelacesToAda utility
  const collateralAmount = useMemo(() => {
    const adaString = convertLovelacesToAda(
      String(COLLATERAL_AMOUNT_LOVELACES),
    );
    return Number(adaString);
  }, []);

  // ADA price ID in token-pricing (CardanoTokenPriceId('ada') -> 'cardano:ada')

  // Extract estimated fee from state when available
  const estimatedFee = useMemo<EstimatedFee | undefined>(() => {
    // Check if state has fees (Ready, Confirming, or Submitting states)
    if (
      collateralFlowState.status === 'Ready' ||
      collateralFlowState.status === 'Confirming' ||
      collateralFlowState.status === 'Submitting' ||
      collateralFlowState.status === 'AwaitingUtxo'
    ) {
      if (!('fees' in collateralFlowState)) {
        return undefined;
      }
      // Find ADA fee entry (lovelace token) - there should only be ADA fees for collateral transactions
      const adaFee = collateralFlowState.fees?.find(
        (fee: FeeEntry) => fee.tokenId === 'lovelace' || fee.tokenId === '',
      );

      if (adaFee?.amount) {
        // Use existing ADA formatter (same as collateralAmount, ActivityDetails, etc.)
        const adaAmount = Number(convertLovelacesToAda(adaFee.amount));

        // Fiat values are only available on mainnet with token pricing enabled
        const adaPriceData = isTokenPricingEnabled
          ? allPrices?.[CardanoTokenPriceId('ada')]
          : undefined;
        const fiatValue =
          adaPriceData?.price == null
            ? undefined
            : adaAmount * adaPriceData.price;
        const fiatFormatted =
          fiatValue == null ? undefined : valueToLocale(fiatValue, 2, 2);

        return {
          ada: adaAmount,
          fiat: fiatValue,
          fiatFormatted,
        };
      }
    }
    return undefined;
  }, [collateralFlowState, allPrices, isTokenPricingEnabled]);

  const handleSetCollateral = useCallback(() => {
    if (collateralFlowState.status === 'Ready') {
      dispatchConfirmed();
    }
  }, [collateralFlowState, dispatchConfirmed]);

  const handleReclaimCollateral = useCallback(() => {
    if (collateralFlowState.status === 'Set') {
      dispatchReclaimRequested();
    }
  }, [collateralFlowState, dispatchReclaimRequested]);

  const handleClose = useCallback(() => {
    dispatchClosed();
  }, [dispatchClosed]);

  return {
    state,
    collateralAmount,
    estimatedFee,
    currency,
    handleSetCollateral,
    handleReclaimCollateral,
    handleClose,
    isProcessing,
  };
};
