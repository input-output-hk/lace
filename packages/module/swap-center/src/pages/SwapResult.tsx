import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Column,
  Icon,
  IconButton,
  Row,
  Sheet,
  SheetFooter,
  SheetHeader,
  Text,
  useCopyToClipboard,
  useTheme,
  spacing,
  useFooterHeight,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const SwapResult = (
  _props: SheetScreenProps<SheetRoutes.SwapResult>,
) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  const swapFlowState = useLaceSelector('swapFlow.selectSwapFlowState');
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
      trackEvent('swaps | result | copy tx id | press');
      copyToClipboard(txId);
    }
  }, [txId, copyToClipboard, trackEvent]);

  const handleDone = useCallback(() => {
    dispatchReset();
    NavigationControls.sheets.close();
  }, [dispatchReset]);

  const handleRetry = useCallback(() => {
    trackEvent('swaps | result | retry | press');
    dispatchRetry();
    dispatchReset();
    NavigationControls.sheets.close();
  }, [dispatchRetry, trackEvent]);

  const title = isSuccess
    ? t('v2.swap.result.success-title')
    : t('v2.swap.result.fail-title');

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll contentContainerStyle={styles.scrollContainer}>
        <Column alignItems="center" gap={spacing.M} style={styles.content}>
          <Icon
            name={isSuccess ? 'Checkmark' : 'Cancel'}
            size={64}
            color={isSuccess ? theme.data.positive : theme.background.negative}
          />
          <Text.L weight="bold" align="center">
            {title}
          </Text.L>
          <Text.XS variant="secondary" align="center">
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
                style={styles.txId}>
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
      {isSuccess ? (
        <SheetFooter
          primaryButton={{
            label: t('v2.swap.result.done'),
            onPress: handleDone,
          }}
        />
      ) : (
        <SheetFooter
          primaryButton={{
            label: t('v2.swap.result.retry'),
            onPress: handleRetry,
          }}
          secondaryButton={{
            label: t('v2.swap.result.close'),
            onPress: handleDone,
          }}
        />
      )}
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    scrollContainer: {
      paddingBottom: footerHeight,
    },
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
