import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  isSendFlowFormStep,
  isSendFlowProcessingStep,
  isSendFlowSummaryStep,
  useSendFlow,
} from '@lace-contract/send-flow';
import { SheetRoutes } from '@lace-lib/navigation';
import { convertAmountToDenominated } from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';
import { useEffect, useRef } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';
import { useFeeToken } from '../../hooks/useFeeToken';
import { useSendFlowNavigation } from '../../hooks/useSendFlowNavigation';

import type { TokenTransfer } from '@lace-contract/send-flow';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type { IconName } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

const getTokenType = (token: TokenTransfer): 'nft' | 'token' => {
  return token.token.value.metadata?.isNft ? 'nft' : 'token';
};

export const useReviewTransaction = (
  props: SheetScreenProps<SheetRoutes.ReviewTransaction>,
) => {
  const { accountName, accountId, blockchainName } = props.route.params;
  const { t } = useTranslation();
  const { note } = useSendFlow();
  const { navigate } = useSendFlowNavigation();
  const { trackEvent } = useAnalytics();
  const dispatchConfirm = useDispatchLaceAction('sendFlow.confirmed', true);
  const dispatchBack = useDispatchLaceAction('sendFlow.back');
  const sendFlowState = useLaceSelector('sendFlow.selectSendFlowState');
  const addresses = useLaceSelector(
    'addresses.selectActiveNetworkAccountAddresses',
  );

  const feeToken = useFeeToken(blockchainName as BlockchainName);

  const labels = {
    headerTitle: t('v2.send-flow.review-transaction.sheet-header'),
    accountLabel: t('v2.send-flow.review-transaction.account'),
    sendingLabel: t('v2.send-flow.review-transaction.sending'),
    recipientsAddressLabel: t(
      'v2.send-flow.review-transaction.recipient-address',
    ),
    expiresByLabel: t('v2.send-flow.review-transaction.expires-by'),
    notesLabel: t('v2.send-flow.review-transaction.notes'),
    amountLabel: t('v2.send-flow.review-transaction.amount'),
    estimatedFeeLabel: t('v2.send-flow.review-transaction.estimated-fee'),
    totalAndFeesLabel: t('v2.send-flow.review-transaction.total-and-fees'),
    totalBreakDownLabel: t('v2.send-flow.review-transaction.total-break-down'),
    nextButtonLabel: t('v2.send-flow.review-transaction.next'),
  };

  const { fees, form } =
    isSendFlowFormStep(sendFlowState) ||
    isSendFlowSummaryStep(sendFlowState) ||
    isSendFlowProcessingStep(sendFlowState)
      ? sendFlowState
      : { fees: [], form: undefined };

  // Extract first fee entry with zero fallback for edge cases
  const firstFeeEntry = fees[0] ?? {
    tokenId: '',
    amount: BigNumber(BigInt('0')),
  };

  const proprietaryState: 'Foreign' | 'Own' = addresses.find(
    address => address.address === form?.address.value,
  )
    ? 'Own'
    : 'Foreign';

  const feeTokenForDisplay = feeToken ?? {
    tokenId: firstFeeEntry.tokenId,
    displayShortName: 'Unknown Token',
    decimals: 0,
  };

  const estimatedFeeValue = {
    amount: '',
    token: feeTokenForDisplay,
    value: convertAmountToDenominated(
      firstFeeEntry.amount.toString(),
      feeTokenForDisplay.decimals,
    ),
    currency: 'USD',
  };

  const mainToken = form?.tokenTransfers.find(
    tokenTransfer =>
      tokenTransfer.token.value.tokenId === firstFeeEntry.tokenId,
  );

  const values = {
    accountValue: {
      name: accountName,
      blockchainName: blockchainName as IconName,
      image: undefined,
    },
    recipientsAddressValue: {
      value: form?.address.value || '',
      proprietaryState,
    },
    // TODO: add expires by date (specific to blockchain)
    expiresByDate: { date: '', time: '' },
    // TODO: add note (specific to blockchain)
    notesValue: note || '',
    amountValue: {
      tickerValueAndSymbol: `${convertAmountToDenominated(
        mainToken?.amount.value.toString() || '0',
        feeTokenForDisplay.decimals || 0,
      )} ${feeTokenForDisplay.displayShortName || ''}`,
      // TODO: get proper currency value
      currencyValueAndName: '',
    },
    estimatedFeeValue,
    // TODO: define what is total value
    totalAndFeesValue: {
      tickerValueAndSymbol: `${convertAmountToDenominated(
        (
          BigInt(firstFeeEntry.amount) + BigInt(mainToken?.amount.value || '0')
        ).toString(),
        feeTokenForDisplay.decimals || 0,
      )} ${feeTokenForDisplay.displayShortName || ''}`,
      currencyValueAndName: '',
    },
    assetsToSend:
      form?.tokenTransfers?.map(tokenTransfer => ({
        type: getTokenType(tokenTransfer),
        value: convertAmountToDenominated(
          tokenTransfer.amount.value.toString() || '0',
          tokenTransfer.token.value.decimals || 0,
        ),
        amount: '',
        symbol:
          tokenTransfer.token.value.metadata?.ticker ||
          tokenTransfer.token.value.displayLongName ||
          '',
        token: {
          tokenId: tokenTransfer.token.value.tokenId,
          name: tokenTransfer.token.value.metadata?.name,
          symbol: tokenTransfer.token.value.metadata?.ticker,
          decimals: tokenTransfer.token.value.decimals,
          available: convertAmountToDenominated(
            tokenTransfer.token.value.available?.toString() || '0',
            tokenTransfer.token.value.decimals || 0,
          ),
          displayShortName: tokenTransfer.token.value.displayShortName,
          metadata: tokenTransfer.token.value.metadata,
        },
        // TODO: get proper currency value
        currency: 'USD',
      })) || [],
  };

  const backButtonPress = () => {
    trackEvent('send | review transaction | back | press');
    dispatchBack();
    navigate(SheetRoutes.Send);
  };

  // Track if confirmation was initiated from this screen (vs navigating here while already in that state)
  const hasInitiatedConfirmation = useRef(false);

  // Watch for state transitions after confirmation is initiated.
  // Navigate to SendResult (processing) as soon as we enter SummaryAwaitingConfirmation
  // so the user sees the processing screen immediately (avoids long delay for e.g. Midnight auth).
  // Also handle Processing and Failure for fast transitions or when coming from Failure retry.
  useEffect(() => {
    if (!hasInitiatedConfirmation.current) return;

    if (
      sendFlowState.status === 'SummaryAwaitingConfirmation' ||
      sendFlowState.status === 'Processing'
    ) {
      navigate(SheetRoutes.SendResult, {
        accountId,
        result: {
          status: 'processing',
          blockchain: blockchainName,
        },
      });
      hasInitiatedConfirmation.current = false;
    } else if (sendFlowState.status === 'Failure') {
      navigate(SheetRoutes.SendResult, {
        accountId,
        result: {
          status: 'failure',
          blockchain: blockchainName,
        },
      });
      hasInitiatedConfirmation.current = false;
    }
  }, [sendFlowState.status, accountId, blockchainName, navigate]);

  // Disable next button when flow has left Summary (awaiting auth or already processing)
  const isNextButtonDisabled =
    sendFlowState.status === 'SummaryAwaitingConfirmation' ||
    sendFlowState.status === 'Processing';

  const nextButtonPress = () => {
    if (isNextButtonDisabled) return;
    trackEvent('send | review transaction | next | press');
    hasInitiatedConfirmation.current = true;
    dispatchConfirm();
  };

  return {
    labels,
    values,
    backButtonPress,
    nextButtonPress,
    isNextButtonDisabled,
  };
};
