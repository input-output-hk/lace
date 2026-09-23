import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { Column, Icon, Sheet, Text, spacing } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { complianceMessagingFor } from '../compliance-messaging';
import { sanitizeErrorDetail } from '../error-detail';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { SheetScreenProps } from '@lace-lib/navigation';

const ERROR_ICON_SIZE = 48;

/**
 * Generic transaction error sheet (Q5a / §9-D): "Something went wrong",
 * Close + Try again. Reached from the Review sheet when a post-confirm
 * build/sign/submit fails (LW-14681), and from the staking detail screen when
 * a claim fails (LW-14684 — flow errors get this sheet; only transient reads
 * keep toasts).
 *
 * Stake/unstake: the Error state preserves the entered request, so Try again
 * re-enters Preparing (auto re-quote) and returns to the still-mounted Review
 * sheet with the details intact; Close resets the flow and closes the stack.
 * Claim: Try again re-dispatches the stored failed claim (which clears the
 * failure) and closes; Close just clears the failure and closes — the
 * Rewards Available banner is still visible beneath either way.
 */
export const RealFiTransactionError = (
  props: SheetScreenProps<SheetRoutes.RealFiTransactionError>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const reset = useDispatchLaceAction('realfiFlow.reset');
  const retry = useDispatchLaceAction('realfiFlow.retryRequested');
  const retryWithdraw = useDispatchLaceAction(
    'realfiPosition.withdrawRequested',
  );
  const clearWithdrawFailure = useDispatchLaceAction(
    'realfiPosition.withdrawFailureCleared',
  );
  const withdrawFailure = useLaceSelector(
    'realfiPosition.selectWithdrawFailure',
  );
  // Verbose failure line under the generic title: the flow's Error state
  // carries the provider/SDK message; shown only when short human-readable
  // text (never key-like tokens or raw dumps).
  const flowState = useLaceSelector('realfiFlow.selectFlowState');
  const errorDetail = sanitizeErrorDetail(
    flowState.status === 'Error' ? flowState.errorDetail : undefined,
  );
  // Compliance-gate failures replace the generic chrome with RealFi's
  // state-specific copy, and drop "Try again" where a retry cannot succeed
  // (refused / still under review) — retrying those only burns screening
  // budget. A service blip keeps the retry.
  const compliance = complianceMessagingFor(
    flowState.status === 'Error' ? flowState.errorCode : undefined,
  );

  const onClose = useCallback(() => {
    if (withdrawFailure) clearWithdrawFailure();
    else reset();
    NavigationControls.closeSheet();
  }, [withdrawFailure, clearWithdrawFailure, reset]);

  const onRetry = useCallback(() => {
    if (withdrawFailure) {
      // Re-dispatch the exact failed claim (the reducer clears the failure)
      // and return to the still-open claim Review sheet beneath — it shows
      // its submitting state and flips to "Claim completed" on success; a
      // repeat failure re-opens this sheet from the detail screen.
      retryWithdraw(withdrawFailure);
      NavigationControls.navigate(SheetRoutes.RealFiWithdraw, {
        accountId: withdrawFailure.accountId,
      });
      return;
    }
    retry();
    // The Error state preserved the request, so retry re-quotes it; `navigate`
    // returns to the existing Review sheet below in the stack, which
    // re-populates with the same details (the amount is never reset).
    NavigationControls.navigate(SheetRoutes.RealFiReviewTransaction);
  }, [withdrawFailure, retryWithdraw, retry]);

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('realfi.review.title')}
          testID="realfi-error-header"
        />
      ),
      footer:
        compliance && !compliance.retryable ? (
          <Sheet.Footer
            primaryButton={{
              label: t('realfi.error.close'),
              onPress: onClose,
              testID: 'realfi-error-close-button',
            }}
          />
        ) : (
          <Sheet.Footer
            secondaryButton={{
              label: t('realfi.error.close'),
              onPress: onClose,
              testID: 'realfi-error-close-button',
            }}
            primaryButton={{
              label: t('realfi.error.try-again'),
              onPress: onRetry,
              testID: 'realfi-error-retry-button',
            }}
          />
        ),
    });
  }, [navigation, t, onClose, onRetry, compliance]);

  return (
    <Sheet.Scroll>
      <Column
        gap={spacing.M}
        alignItems="center"
        justifyContent="center"
        style={styles.content}>
        <Icon
          name="AlertTriangle"
          size={ERROR_ICON_SIZE}
          testID="realfi-error-icon"
        />
        <Text.L align="center" testID="realfi-error-title">
          {t(compliance?.titleKey ?? 'realfi.error.title')}
        </Text.L>
        {compliance !== undefined && (
          <Text.S
            align="center"
            variant="secondary"
            testID="realfi-error-compliance-body">
            {t(compliance.bodyKey)}
          </Text.S>
        )}
        {compliance === undefined && errorDetail !== undefined && (
          <Text.S
            align="center"
            variant="secondary"
            testID="realfi-error-detail">
            {errorDetail}
          </Text.S>
        )}
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.XXL,
  },
});
