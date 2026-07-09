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

export const SwapResult = (props: SheetScreenProps<SheetRoutes.SwapResult>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(), []);

  const swapFlowState = useLaceSelector('swapFlow.selectSwapFlowState');
  const swapSessionId = useLaceSelector('swapAnalytics.selectSwapSessionId');
  const showToast = useDispatchLaceAction('ui.showToast');
  const dispatchReset = useDispatchLaceAction('swapFlow.reset', true);
  const dispatchRetry = useDispatchLaceAction('swapFlow.retryRequested', true);
  const { trackEvent } = useAnalytics();

  const isSuccess = swapFlowState.status === 'Success';
  const isError = swapFlowState.status === 'Error';

  // Ensure the flow always resets on dismissal for terminal states (Success
  // or Error), whether the user taps the button, swipes down, or taps the
  // backdrop. Without this, pan/backdrop dismissals would leave stale
  // terminal state behind.
  const isTerminalRef = useRef(isSuccess || isError);
  isTerminalRef.current = isSuccess || isError;
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
          {isSuccess
            ? t('v2.swap.result.success-subtitle')
            : errorMessage
            ? t(errorMessage, { defaultValue: errorMessage })
            : t('v2.swap.result.fail-subtitle')}
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
