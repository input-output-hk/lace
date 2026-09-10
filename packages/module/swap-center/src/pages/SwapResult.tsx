import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Column,
  Icon,
  IconButton,
  Row,
  Sheet,
  Text,
  useCopyToClipboard,
  useTheme,
  spacing,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

// `errorMessage` arrives in one of three shapes: one of our i18n keys, a short
// human-readable provider detail ("Insufficient funds."), or a raw node/client
// dump (JSON bodies, Haskell constructors) that can run to kilobytes. Only the
// first two belong on screen — the dump already reached the logs and analytics
// at the point of failure.
const isTranslationKeyLike = (value: string): boolean =>
  /^[\w-]+(\.[\w-]+)+$/.test(value);
const MAX_HUMAN_ERROR_LENGTH = 140;
const isHumanReadable = (value: string): boolean =>
  value.length <= MAX_HUMAN_ERROR_LENGTH && !/[{}[\]\\"]/.test(value);

const isTerminalStatus = (status: string): boolean =>
  status === 'Success' || status === 'Error';

export const SwapResult = (props: SheetScreenProps<SheetRoutes.SwapResult>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(), []);

  const liveFlowState = useLaceSelector('swapFlow.selectSwapFlowState');
  const swapSessionId = useLaceSelector('swapAnalytics.selectSwapSessionId');
  const showToast = useDispatchLaceAction('ui.showToast');
  const dispatchReset = useDispatchLaceAction('swapFlow.reset', true);
  const dispatchRetry = useDispatchLaceAction('swapFlow.retryRequested', true);
  const { trackEvent } = useAnalytics();

  // Render from a FROZEN terminal snapshot, never the live state: Done resets
  // the flow to Idle while the sheet is still closing, and a live-derived
  // render flips the Success content into the failure branch mid-animation
  // (visible in the extension, where the reset round-trips through the SW
  // store). Once a result is on screen, nothing may change it.
  const isLiveTerminal = isTerminalStatus(liveFlowState.status);
  const frozenTerminalRef = useRef(isLiveTerminal ? liveFlowState : undefined);
  if (isLiveTerminal) {
    frozenTerminalRef.current = liveFlowState;
  }
  const swapFlowState = frozenTerminalRef.current ?? liveFlowState;

  const isSuccess = swapFlowState.status === 'Success';
  const isError = swapFlowState.status === 'Error';

  // Ensure the flow always resets on dismissal for terminal states (Success
  // or Error), whether the user taps the button, swipes down, or taps the
  // backdrop. Without this, pan/backdrop dismissals would leave stale
  // terminal state behind. Tracks the LIVE status, not the frozen snapshot:
  // after Done already reset the flow, unmount must not reset again.
  const isTerminalRef = useRef(isLiveTerminal);
  isTerminalRef.current = isLiveTerminal;
  useEffect(
    () => () => {
      if (isTerminalRef.current) {
        dispatchReset();
      }
    },
    [dispatchReset],
  );

  const txId =
    isSuccess && 'txId' in swapFlowState ? swapFlowState.txId : undefined;
  const errorMessage =
    isError && 'errorMessage' in swapFlowState
      ? swapFlowState.errorMessage
      : undefined;

  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      showToast({
        text: t('v2.swap.result.tx-id-copied'),
        color: 'positive',
        duration: 3,
        leftIcon: {
          name: 'Checkmark',
          size: 20,
          color: theme.background.primary,
        },
      });
    },
    onError: () => {
      showToast({
        text: t('v2.generic.btn.copy-error'),
        color: 'negative',
        duration: 3,
        leftIcon: {
          name: 'AlertTriangle',
          size: 20,
          color: theme.background.primary,
        },
      });
    },
  });

  const handleCopyTxId = useCallback(() => {
    if (txId) {
      trackEvent('swaps | result | copy tx id | press', {
        ...(swapSessionId && { swapSessionId }),
      });
      copyToClipboard(txId);
    }
  }, [txId, copyToClipboard, trackEvent, swapSessionId]);

  const handleDone = useCallback(() => {
    dispatchReset();
    NavigationControls.closeSheet();
  }, [dispatchReset]);

  const handleRetry = useCallback(() => {
    trackEvent('swaps | result | retry | press', {
      ...('sellTokenId' in swapFlowState && {
        tokenIn: swapFlowState.sellTokenId,
      }),
      ...('buyTokenId' in swapFlowState && {
        tokenOut: swapFlowState.buyTokenId,
      }),
      ...('sellAmount' in swapFlowState && {
        quantity: swapFlowState.sellAmount,
      }),
      ...(swapSessionId && { swapSessionId }),
    });
    dispatchRetry();
    dispatchReset();
    NavigationControls.closeSheet();
  }, [dispatchRetry, dispatchReset, trackEvent, swapFlowState, swapSessionId]);

  const title = isSuccess
    ? t('v2.swap.result.success-title')
    : t('v2.swap.result.fail-title');

  const failureText = (() => {
    if (errorMessage && isTranslationKeyLike(errorMessage)) {
      return t(errorMessage, { defaultValue: errorMessage });
    }
    if (errorMessage && isHumanReadable(errorMessage)) {
      return errorMessage;
    }
    return t('v2.swap.result.fail-subtitle');
  })();

  useEffect(() => {
    props.navigation.setOptions({
      header: <Sheet.Header title={title} testID="swap-result-header" />,
      footer: isSuccess ? (
        <Sheet.Footer
          primaryButton={{
            label: t('v2.swap.result.done'),
            onPress: handleDone,
            testID: 'swap-result-done-button',
          }}
        />
      ) : (
        <Sheet.Footer
          primaryButton={{
            label: t('v2.swap.result.retry'),
            onPress: handleRetry,
            testID: 'swap-result-retry-button',
          }}
          secondaryButton={{
            label: t('v2.swap.result.close'),
            onPress: handleDone,
            testID: 'swap-result-close-button',
          }}
        />
      ),
    });
  }, [props.navigation, title, isSuccess, t, handleDone, handleRetry]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.scrollContainer}>
      <Column alignItems="center" gap={spacing.M} style={styles.content}>
        <Icon
          name={isSuccess ? 'Checkmark' : 'Cancel'}
          size={64}
          color={isSuccess ? theme.data.positive : theme.background.negative}
          testID="swap-result-icon"
        />
        <Text.L weight="bold" align="center" testID="swap-result-title">
          {title}
        </Text.L>
        <Text.XS
          variant="secondary"
          align="center"
          testID="swap-result-subtitle">
          {isSuccess ? t('v2.swap.result.success-subtitle') : failureText}
        </Text.XS>
        {txId ? (
          <Row alignItems="center" gap={spacing.XS} style={styles.txIdRow}>
            <Text.XS
              variant="secondary"
              ellipsizeMode="middle"
              numberOfLines={1}
              style={styles.txId}
              testID="swap-result-tx-id">
              {txId}
            </Text.XS>
            <IconButton.Static
              icon={<Icon name="Copy" size={16} />}
              onPress={handleCopyTxId}
            />
          </Row>
        ) : null}
      </Column>
    </Sheet.Scroll>
  );
};

const getStyles = () =>
  StyleSheet.create({
    scrollContainer: {},
    content: {
      flex: 1,
      padding: spacing.M,
      justifyContent: 'center',
    },
    txIdRow: {
      alignSelf: 'stretch',
    },
    txId: {
      flexShrink: 1,
    },
  });
