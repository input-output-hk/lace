import { useTranslation } from '@lace-contract/i18n';
import {
  DUST_TOKEN_DECIMALS,
  getDustTokenTickerByNetwork,
  getNightTokenTickerByNetwork,
  isDustAddress,
} from '@lace-contract/midnight-context';
import { isSendFlowClosed, isSendFlowSuccess } from '@lace-contract/send-flow';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  convertAmountToDenominated,
  valueToLocale,
} from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';
import debounce from 'lodash/fp/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type {
  MidnightSpecificSendFlowData,
  MidnightAccountId,
} from '@lace-contract/midnight-context';
import type { SendFlowSliceState } from '@lace-contract/send-flow';
import type { Token } from '@lace-contract/tokens';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type { FeeEntry } from '@lace-lib/ui-toolkit';

type DustDesignationStep = 'form' | 'review';

// States where review screen should be shown
const REVIEW_STATES = new Set(['Summary', 'SummaryAwaitingConfirmation']);

export const useDustDesignationSheet = (
  props: SheetScreenProps<SheetRoutes.DustDesignation>,
) => {
  const { accountId } = props.route.params;
  const { t } = useTranslation();

  const [dustAddress, setDustAddress] = useState('');
  const hasInitialSynced = useRef(false);
  const wasFlowOpen = useRef(false);
  const hasInitiatedConfirmation = useRef(false);

  // Redux state and actions
  const dispatchClosed = useDispatchLaceAction('sendFlow.closed', true);
  const sendFlowState = useLaceSelector(
    'sendFlow.selectSendFlowState',
  ) as SendFlowSliceState<MidnightSpecificSendFlowData>;
  const dispatchOpenRequested = useDispatchLaceAction('sendFlow.openRequested');
  const dispatchFormDataChanged = useDispatchLaceAction(
    'sendFlow.formDataChanged',
  );
  const dispatchConfirm = useDispatchLaceAction('sendFlow.confirmed', true);
  const dispatchBack = useDispatchLaceAction('sendFlow.back');

  // Get network ID for address validation
  const currentNetworkId = useLaceSelector('midnightContext.selectNetworkId');
  const networkType = useLaceSelector('network.selectNetworkType');

  // Get addresses for the account
  const midnightAddresses = useLaceSelector(
    'addresses.selectByAccountId',
    accountId,
  );

  // Get tokens for the account
  const tokensGroupedByAccount = useLaceSelector(
    'tokens.selectTokensGroupedByAccount',
  );

  // Get the account details
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const midnightAccount = useMemo(
    () =>
      accounts.find(
        a => a.accountId === accountId && a.blockchainName === 'Midnight',
      ),
    [accounts, accountId],
  ) as AnyAccount & { accountId: MidnightAccountId };

  // Find own dust address
  const ownDustAddress = useMemo(
    () =>
      midnightAddresses
        .map(({ address }) => address)
        .find(address => isDustAddress(address, currentNetworkId)),
    [midnightAddresses, currentNetworkId],
  );

  // Find NIGHT token (native unshielded token)
  const nightToken = useMemo(() => {
    const accountTokens = tokensGroupedByAccount[accountId];
    if (!accountTokens?.fungible) return null;

    // Find the NIGHT token - it's the native unshielded token
    const expectedTicker = getNightTokenTickerByNetwork(networkType);
    return accountTokens.fungible.find(
      token => token.metadata?.ticker === expectedTicker,
    ) as Token | null;
  }, [tokensGroupedByAccount, accountId, networkType]);

  // Get dust generation details from midnightContext
  const dustGenerationDetails = useLaceSelector(
    'midnightContext.selectDustGenerationDetails',
    [midnightAccount.accountId],
  )[midnightAccount.accountId];

  // Format the available balance for display
  const formattedNightBalance = useMemo(() => {
    if (!nightToken) return '0';
    const denominated = convertAmountToDenominated(
      nightToken.available?.toString() || '0',
      nightToken.decimals || 0,
    );
    return valueToLocale(denominated);
  }, [nightToken]);

  // Check if flow is open
  const isFlowOpen =
    !isSendFlowClosed(sendFlowState) && !isSendFlowSuccess(sendFlowState);

  // Derive current step from state machine status (not local state)
  // This ensures UI is always in sync with the actual state machine
  const currentStep: DustDesignationStep = REVIEW_STATES.has(
    sendFlowState.status,
  )
    ? 'review'
    : 'form';

  // Check if state machine is ready for review interaction
  // Must be in Summary state with complete fee data
  const isReviewReady = useMemo(() => {
    if (!REVIEW_STATES.has(sendFlowState.status)) return false;
    if (!isFlowOpen) return false;

    // Ensure fees are populated (confirms tx was built successfully)
    const hasFees = 'fees' in sendFlowState && sendFlowState.fees.length > 0;
    return hasFees;
  }, [sendFlowState, isFlowOpen]);

  // Read address error from state machine and translate it
  const addressError =
    isFlowOpen && 'form' in sendFlowState && sendFlowState.form.address.error
      ? t(sendFlowState.form.address.error)
      : null;

  // Read fees from state machine
  const estimatedFee: FeeEntry[] = useMemo(() => {
    if (!isFlowOpen) return [];

    const fees = 'fees' in sendFlowState ? sendFlowState.fees : [];
    if (!fees.length) return [];

    return fees.map(fee => {
      const denominatedAmount = convertAmountToDenominated(
        fee.amount.toString(),
        DUST_TOKEN_DECIMALS,
      );
      return {
        amount: valueToLocale(denominatedAmount),
        token: {
          tokenId: fee.tokenId,
          displayShortName: getDustTokenTickerByNetwork(networkType),
        },
        value: '',
        currency: '',
      };
    });
  }, [isFlowOpen, sendFlowState, networkType]);

  // Check if user has insufficient DUST to cover the fee
  const insufficientDustError = useMemo(() => {
    if (!isFlowOpen) return null;

    const rawFees = 'fees' in sendFlowState ? sendFlowState.fees : [];
    if (rawFees.length === 0) return null;

    const rawFeeAmount = BigNumber.valueOf(rawFees[0].amount);
    if (rawFeeAmount === 0n) return null; // First designation is free

    const dustAvailable = dustGenerationDetails?.currentValue ?? 0n;

    if (dustAvailable < rawFeeAmount) {
      return t('designation-flow.error.insufficient-dust', {
        dustTokenTicker: getDustTokenTickerByNetwork(networkType),
      });
    }

    return null;
  }, [isFlowOpen, sendFlowState, dustGenerationDetails, t, networkType]);

  // Debounced dispatch to Redux for address changes
  const debouncedAddressDispatch = useMemo(
    () =>
      debounce(100, (value: string) => {
        dispatchFormDataChanged({
          data: {
            fieldName: 'address',
            value,
          },
        });
      }),
    [dispatchFormDataChanged],
  );

  // Initialize send flow on mount
  useEffect(() => {
    // Skip if prerequisites are missing
    if (!nightToken || !ownDustAddress) return;

    // Handle terminal states from a previous flow
    if (
      sendFlowState.status === 'Success' ||
      sendFlowState.status === 'Failure'
    ) {
      dispatchClosed();
      return; // Wait for state to change and effect to re-run
    }

    // Initialize when in Idle or DiscardingTx state
    // State machine supports openRequested in both states
    if (
      sendFlowState.status === 'Idle' ||
      sendFlowState.status === 'DiscardingTx'
    ) {
      dispatchOpenRequested({
        accountId,
        blockchainSpecificData: { flowType: 'dust-designation' },
        initialAddress: ownDustAddress,
        initialAmount: nightToken.available,
        initialSelectedToken: nightToken,
      });
      setDustAddress(ownDustAddress);
    }
  }, [
    sendFlowState.status,
    nightToken,
    ownDustAddress,
    accountId,
    dispatchClosed,
    dispatchOpenRequested,
  ]);

  // Sync local address state with state machine when flow opens (only once)
  useEffect(() => {
    if (!hasInitialSynced.current && isFlowOpen && 'form' in sendFlowState) {
      const addressValue = sendFlowState.form.address.value;
      if (addressValue) {
        setDustAddress(addressValue);
        hasInitialSynced.current = true;
      }
    }
  }, [isFlowOpen, sendFlowState]);

  // Reset local state only when flow transitions from open to closed
  // This prevents interference during initialisation and state transitions
  useEffect(() => {
    if (wasFlowOpen.current && !isFlowOpen) {
      // Flow just closed - reset for next open
      hasInitialSynced.current = false;
      setDustAddress('');
    }
    wasFlowOpen.current = isFlowOpen;
  }, [isFlowOpen]);

  // Navigate to SendResult when state transitions after confirmation
  useEffect(() => {
    if (!hasInitiatedConfirmation.current) return;

    if (
      sendFlowState.status === 'SummaryAwaitingConfirmation' ||
      sendFlowState.status === 'Processing'
    ) {
      NavigationControls.sheets.navigate(
        SheetRoutes.SendResult,
        {
          accountId: accountId as string,
          result: {
            status: 'processing',
            blockchain: 'Midnight',
          },
        },
        { reset: true },
      );
      hasInitiatedConfirmation.current = false;
    } else if (sendFlowState.status === 'Failure') {
      NavigationControls.sheets.navigate(
        SheetRoutes.SendResult,
        {
          accountId: accountId as string,
          result: {
            status: 'failure',
            blockchain: 'Midnight',
          },
        },
        { reset: true },
      );
      hasInitiatedConfirmation.current = false;
    }
  }, [sendFlowState.status, accountId]);

  // Cleanup on unmount - cancel debounced dispatch and reset refs
  // NOTE: Do NOT call dispatchClosed() here - the send flow needs to continue
  // when navigating to SendResult during transaction processing
  useEffect(() => {
    return () => {
      debouncedAddressDispatch.cancel();
      hasInitialSynced.current = false;
      wasFlowOpen.current = false;
      hasInitiatedConfirmation.current = false;
    };
  }, [debouncedAddressDispatch]);

  const handleAddressChange = useCallback(
    (value: string) => {
      setDustAddress(value);
      debouncedAddressDispatch(value);
    },
    [debouncedAddressDispatch],
  );

  const handleClose = useCallback(() => {
    dispatchClosed();
    NavigationControls.sheets.close();
  }, [dispatchClosed]);

  const handleDesignate = useCallback(() => {
    debouncedAddressDispatch.flush();
    // Request transition Form → Summary
    // UI will update automatically when state machine transitions
    dispatchConfirm();
  }, [debouncedAddressDispatch, dispatchConfirm]);

  const handleBackToForm = useCallback(() => {
    // Request transition Summary → Form
    // UI will update automatically when state machine transitions
    dispatchBack();
  }, [dispatchBack]);

  const handleConfirm = useCallback(() => {
    hasInitiatedConfirmation.current = true;
    dispatchConfirm();
  }, [dispatchConfirm]);

  // Get address label based on whether it's own or external
  const getAddressLabel = useCallback(
    (address: string) => {
      if (!address) return t('designation-flow.address.label.own-address');
      return address === ownDustAddress
        ? t('designation-flow.address.label.own-address')
        : t('designation-flow.address.label.foreign-address');
    },
    [ownDustAddress, t],
  );

  // Check if the form is valid for proceeding
  // Must check confirmButtonEnabled to ensure the state machine
  // has finished validation and tx-building before allowing confirmation
  const isFormValid = useMemo(() => {
    // State machine must be open and ready for confirmation
    if (!isFlowOpen) return false;
    const isConfirmEnabled =
      'confirmButtonEnabled' in sendFlowState &&
      sendFlowState.confirmButtonEnabled;
    if (!isConfirmEnabled) return false;

    if (!nightToken || !dustAddress) return false;
    if (addressError) return false;
    if (!isDustAddress(dustAddress, currentNetworkId)) return false;
    if (!(nightToken.available && BigNumber.valueOf(nightToken.available) > 0n))
      return false;

    // Check for insufficient DUST error
    if (insufficientDustError) return false;

    return true;
  }, [
    isFlowOpen,
    sendFlowState,
    nightToken,
    dustAddress,
    addressError,
    currentNetworkId,
    insufficientDustError,
  ]);

  const dustTokenTicker = getDustTokenTickerByNetwork(networkType);
  const nightTokenTicker = getNightTokenTickerByNetwork(networkType);

  const copies = {
    sheetTitle: t('designation-flow.drawer.title', { dustTokenTicker }),
    formDescription: t('designation-flow.form.description', {
      dustTokenTicker,
    }),
    dustStartsLabel: t('designation-flow.form.dust-designation-starts'),
    dustStartsValue: t('designation-flow.form.dust-designation-starts.value'),
    estimatedFeeLabel: t('v2.send-flow.review-transaction.estimated-fee'),
    designateButtonLabel: t('designation-flow.form.send-button'),
    reviewTitle: t('v2.send-flow.review-transaction.sheet-header'),
    designatingLabel: t('designation-flow.tx-info.token-label.pre-tx'),
    nextButtonLabel: t('designation-flow.form.send-button'),
  };

  return {
    currentStep,
    dustAddress,
    ownDustAddress,
    nightToken,
    nightTokenTicker,
    dustTokenTicker,
    formattedNightBalance,
    estimatedFee,
    addressError,
    insufficientDustError,
    isFormValid,
    isReviewReady,
    account: midnightAccount,
    copies,
    getAddressLabel,
    handleAddressChange,
    handleClose,
    handleDesignate,
    handleBackToForm,
    handleConfirm,
  };
};
