import { useAnalytics } from '@lace-contract/analytics';
import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { isSendFlowSuccess, useSendFlow } from '@lace-contract/send-flow';
import { WalletType } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';
import { useSendFlowNavigation } from '../../hooks/useSendFlowNavigation';

import { getTransactionDetails } from './getTransactionDetails';
import { parseErrorDetails } from './parseErrorDetails';

import type { SheetScreenProps } from '@lace-lib/navigation';
import type { IconName } from '@lace-lib/ui-toolkit';
import type { BlockchainName, ErrorObject } from '@lace-lib/util-store';

const MINIMUM_PROCESSING_DISPLAY_MS = 1000;

type TransactionStatus = 'failure' | 'processing' | 'success';

export const useSendResult = (
  props: SheetScreenProps<SheetRoutes.SendResult>,
) => {
  const { t } = useTranslation();
  const { result } = props.route.params;
  const { resetSendFlow } = useSendFlow();
  const { navigate } = useSendFlowNavigation();

  const { trackEvent } = useAnalytics();

  // Watch state machine directly for status changes
  const sendFlowState = useLaceSelector('sendFlow.selectSendFlowState');

  // Dispatch confirmed to transition from Failure → Form when retrying
  const dispatchConfirmed = useDispatchLaceAction('sendFlow.confirmed', true);

  // Enforce minimum display time to prevent flicker on fast transactions
  const [hasMinimumTimeElapsed, setHasMinimumTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinimumTimeElapsed(true);
    }, MINIMUM_PROCESSING_DISPLAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Derive status from state machine (not route params)
  // Show failure immediately (e.g., auth cancelled), but enforce minimum timer for success
  const derivedStatus: TransactionStatus = useMemo(() => {
    // If state is already failure, show it immediately (no timer wait)
    // This prevents showing "processing" when auth was cancelled
    if (sendFlowState.status === 'Failure') return 'failure';
    // Enforce minimum timer for processing → success transitions to prevent flickering
    if (!hasMinimumTimeElapsed) return 'processing';
    if (isSendFlowSuccess(sendFlowState)) return 'success';
    return 'processing'; // Still waiting for state machine
  }, [hasMinimumTimeElapsed, sendFlowState]);

  const isSuccess = derivedStatus === 'success';
  const isFailure = derivedStatus === 'failure';

  const status = derivedStatus;

  const blockchainType = result.blockchain as BlockchainName | null;
  const isMidnight = blockchainType === 'Midnight';

  const [sendFlowSheetUICustomisation] = useUICustomisation(
    'addons.loadSendFlowSheetUICustomisations',
    {
      blockchainOfTheTransaction: blockchainType,
    },
  );

  const shouldHidePrimaryButtonOnSuccess =
    sendFlowSheetUICustomisation?.hidePrimaryButtonOnSuccess ?? true;

  const shouldPreventClose =
    status === 'processing' &&
    sendFlowSheetUICustomisation?.isProcessingResultSheetClosable === false;

  useEffect(() => {
    props.navigation.setOptions({ preventClose: shouldPreventClose });
  }, [props.navigation, shouldPreventClose]);

  const isHardwareWalletFlow =
    'wallet' in sendFlowState &&
    (sendFlowState.wallet.type === WalletType.HardwareLedger ||
      sendFlowState.wallet.type === WalletType.HardwareTrezor);

  const hwErrorKeys =
    isFailure && isHardwareWalletFlow && 'errorTranslationKeys' in sendFlowState
      ? sendFlowState.errorTranslationKeys
      : undefined;

  const copies = {
    success: {
      title: t('v2.send-flow.success.title'),
      subtitle: isMidnight
        ? t('v2.send-flow.success.midnight-subtitle')
        : t('v2.send-flow.success.subtitle'),
      primaryButtonLabel: t('v2.send-flow.success.primary-button'),
    },
    failure: {
      title: hwErrorKeys
        ? t(hwErrorKeys.title)
        : t('v2.send-flow.failure.title'),
      subtitle: hwErrorKeys
        ? t(hwErrorKeys.subtitle)
        : t('v2.send-flow.failure.subtitle'),
      errorDetailsTitle: t('v2.send-flow.failure.details-title'),
      primaryButtonLabel: t('v2.send-flow.failure.primary-button'),
      errorMessage: String(
        t('v2.send-flow.failure.network-timeout-error-message'),
      ),
    },
    processing: {
      title: isHardwareWalletFlow
        ? t('v2.send-flow.hw-signing.title')
        : t('v2.send-flow.processing-title'),
      subtitle: isHardwareWalletFlow
        ? t('v2.send-flow.hw-signing.subtitle')
        : isMidnight
        ? t('midnight.send-flow.processing.info')
        : t('v2.send-flow.processing-subtitle'),
    },
    closeButtonLabel: t('v2.send-flow.transaction-result.sheet-close-button'),
    networkTimeoutErrorLabels: {
      codeTitle: String(
        t('v2.send-flow.failure.network-timeout-error-code-title'),
      ),
      timestampTitle: String(
        t('v2.send-flow.failure.network-timeout-error-timestamp-title'),
      ),
      requestIdTitle: String(
        t('v2.send-flow.failure.network-timeout-error-request-id-title'),
      ),
    },
  };

  const iconName: IconName = (() => {
    if (isSuccess) return 'RelievedFace';
    if (isFailure) return 'Sad';
    return 'Clock';
  })();

  const icon = {
    name: iconName,
    variant: status === 'processing' ? ('stroke' as const) : ('solid' as const),
    size: 48,
  };

  const { title: headerTitle, subtitle } = copies[status];

  // Extract error details from send flow state
  const submissionError: ErrorObject | undefined = useMemo(() => {
    if (sendFlowState.status === 'Failure') {
      return sendFlowState.error;
    }
    return undefined;
  }, [sendFlowState]);

  const errorDetails =
    isFailure && !hwErrorKeys
      ? (() => {
          const parsed = parseErrorDetails(
            submissionError,
            copies.failure.errorMessage,
            copies.networkTimeoutErrorLabels,
          );

          return {
            title: copies.failure.errorDetailsTitle,
            description: `${parsed.errorMessage}\n`,
            errorCode: parsed.errorCode,
            timestamp: parsed.timestamp,
            requestId: parsed.requestId,
          };
        })()
      : undefined;

  const primaryButton = (() => {
    if (isSuccess && !shouldHidePrimaryButtonOnSuccess) {
      return {
        primaryButtonLabel: copies.success.primaryButtonLabel,
        primaryButtonPress: () => {
          resetSendFlow();
          trackEvent('send | result | success | primary button | press');
          NavigationControls.sheets.navigate(SheetRoutes.ComingSoon, {
            featureName: copies.success.primaryButtonLabel,
          });
        },
      };
    }
    if (isFailure) {
      return {
        primaryButtonLabel: copies.failure.primaryButtonLabel,
        primaryButtonPress: () => {
          resetSendFlow();
          trackEvent('send | result | failure | primary button | press');
          dispatchConfirmed();
          navigate(SheetRoutes.Send);
        },
      };
    }
    return undefined;
  })();

  const footer = {
    closeButton: shouldPreventClose
      ? undefined
      : {
          closeButtonLabel: copies.closeButtonLabel,
          closeButtonPress: () => {
            resetSendFlow();
            NavigationControls.sheets.close();
          },
        },
    primaryButton,
  };

  const networkType = useLaceSelector('network.selectNetworkType');
  const transactionDetails = useMemo(() => {
    if (!isSuccess) return undefined;
    const nativeTokenInfo = sendFlowSheetUICustomisation?.nativeTokenInfo?.({
      networkType,
    });
    return getTransactionDetails(sendFlowState, {
      nativeTokenInfo,
    });
  }, [isSuccess, sendFlowState, sendFlowSheetUICustomisation, networkType]);

  const transactionDetailsLabels = {
    sentLabel: t('v2.send-flow.result-details.sent'),
    recipientLabel: t('v2.send-flow.result-details.recipient'),
    feeLabel: t('v2.send-flow.result-details.fee'),
  };

  // Return derived status instead of route params for transactionState
  const transactionState = {
    status: derivedStatus,
    blockchain: result.blockchain,
  };

  return {
    headerTitle,
    icon,
    subtitle,
    errorDetails,
    footer,
    result: transactionState,
    transactionDetails,
    transactionDetailsLabels,
    shouldHidePrimaryButtonOnSuccess,
  };
};
